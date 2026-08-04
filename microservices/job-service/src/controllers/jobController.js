const { Job, Department, sequelize } = require('../models');
const aiClient = require('../utils/AiClient');

// POST /jobs
// ... (rest of code is unmodified but this replacement is contiguous)

// POST /jobs
exports.createJob = async (request, reply) => {
  const { title, description, requirements, location, contract_type, experience_level, salary_min, salary_max, currency, salary_negotiable, department_id, closes_at } = request.body;
  const tenant_id = request.user.company_id;
  const created_by = request.user.user_id;

  if (salary_max < salary_min) {
    return reply.code(400).send({ error: 'salary_max debe ser mayor o igual a salary_min.' });
  }

  try {
    const jobText = `${title}. ${description}. Requisitos: ${requirements}`;
    let embedding_vector = await aiClient.getEmbedding(jobText);
    
    // Fallback if vector generation fails temporarily
    if (!embedding_vector) embedding_vector = null;

    const job = await Job.create({
      tenant_id,
      department_id,
      created_by,
      title,
      description,
      requirements,
      location,
      contract_type,
      experience_level,
      salary_min,
      salary_max,
      currency,
      salary_negotiable,
      closes_at,
      status: 'draft',
      embedding_vector,
    });
    return reply.code(201).send(job);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: `Database error: ${error.message}` });
  }
};

// GET /jobs
exports.getJobs = async (request, reply) => {
  const tenant_id = request.user.company_id;
  const { status, department_id, limit = 20, offset = 0 } = request.query;

  const where = { tenant_id };
  if (status) where.status = status;
  if (department_id) where.department_id = department_id;

  try {
    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      include: [{ model: Department, attributes: ['name'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    return reply.send({ total: count, limit, offset, data: jobs });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: `Database error: ${error.message}` });
  }
};

// GET /jobs/:id
exports.getJobById = async (request, reply) => {
  const { id } = request.params;
  const tenant_id = request.user.company_id;

  try {
    const job = await Job.findOne({
      where: { id, tenant_id },
      include: [{ model: Department, attributes: ['name'] }],
    });
    if (!job) return reply.code(404).send({ error: 'Vacante no encontrada.' });
    return reply.send(job);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: `Database error: ${error.message}` });
  }
};

// PATCH /jobs/:id
exports.updateJob = async (request, reply) => {
  const { id } = request.params;
  const tenant_id = request.user.company_id;
  const { title, description, requirements, location, contract_type, experience_level, salary_min, salary_max, currency, salary_negotiable, department_id, closes_at, status } = request.body;

  const effectiveMin = salary_min ?? undefined;
  const effectiveMax = salary_max ?? undefined;
  if (effectiveMin !== undefined && effectiveMax !== undefined && effectiveMax < effectiveMin) {
    return reply.code(400).send({ error: 'salary_max debe ser mayor o igual a salary_min.' });
  }

  try {
    const job = await Job.findOne({ where: { id, tenant_id } });
    if (!job) return reply.code(404).send({ error: 'Vacante no encontrada.' });

    // Regenerar el vector si cambiaron los textos principales
    let embedding_vector = job.embedding_vector;
    const tituloCambio = title !== undefined && title !== job.title;
    const descripcionCambio = description !== undefined && description !== job.description;
    const requisitosCambio = requirements !== undefined && requirements !== job.requirements;

    if (tituloCambio || descripcionCambio || requisitosCambio) {
      const jobText = `${title ?? job.title}. ${description ?? job.description}. Requisitos: ${requirements ?? job.requirements}`;
      const newEmbedding = await aiClient.getEmbedding(jobText);
      if (newEmbedding) embedding_vector = newEmbedding;
    }

    await job.update({ title, description, requirements, location, contract_type, experience_level, salary_min, salary_max, currency, salary_negotiable, department_id, closes_at, status, embedding_vector });
    return reply.send(job);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: `Database error: ${error.message}` });
  }
};

// DELETE /jobs/:id
exports.deleteJob = async (request, reply) => {
  const { id } = request.params;
  const tenant_id = request.user.company_id;

  const transaction = await sequelize.transaction();
  try {
    const job = await Job.findOne({ where: { id, tenant_id }, transaction });
    if (!job) {
      await transaction.rollback();
      return reply.code(404).send({ error: 'Vacante no encontrada.' });
    }

    // La BD (talent_db) es compartida: postulaciones, su historial, notas y los
    // bookmarks referencian esta vacante con FK y no hay ON DELETE CASCADE, así
    // que se limpian en orden antes de borrar el Job.
    const repl = { replacements: { jobId: id }, transaction };
    await sequelize.query('DELETE FROM application_stage_history WHERE application_id IN (SELECT id FROM applications WHERE job_id = :jobId)', repl);

    // application_notes puede no existir en despliegues previos al fix de notas.
    const [notesReg] = await sequelize.query("SELECT to_regclass('public.application_notes') AS t", { transaction });
    if (notesReg[0] && notesReg[0].t) {
      await sequelize.query('DELETE FROM application_notes WHERE application_id IN (SELECT id FROM applications WHERE job_id = :jobId)', repl);
    }

    await sequelize.query('DELETE FROM applications WHERE job_id = :jobId', repl);
    await sequelize.query('DELETE FROM bookmarks WHERE job_id = :jobId', repl);

    await job.destroy({ transaction });
    await transaction.commit();
    return reply.send({ message: 'Vacante eliminada.' });
  } catch (error) {
    await transaction.rollback();
    request.log.error(error);
    return reply.code(500).send({ error: `Database error: ${error.message}` });
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /jobs/public/:token  — job detail by public token (no auth, for application form)
exports.getJobByToken = async (request, reply) => {
  const { token } = request.params;

  if (!UUID_REGEX.test(token)) {
    return reply.code(404).send({ error: 'Vacante no encontrada o no disponible.' });
  }

  try {
    const job = await Job.findOne({
      where: { public_token: token, status: 'published' },
      include: [{ model: Department, attributes: ['name'] }],
      attributes: ['id', 'title', 'description', 'requirements', 'location', 'contract_type', 'experience_level', 'salary_min', 'salary_max', 'currency', 'salary_negotiable', 'closes_at', 'createdAt'],
    });
    if (!job) return reply.code(404).send({ error: 'Vacante no encontrada o no disponible.' });
    return reply.send(job);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: `Database error: ${error.message}` });
  }
};

// GET /jobs/public?tenant_id=X  — public listing for candidates (no auth)
exports.getPublicJobs = async (request, reply) => {
  const { tenant_id, limit = 20, offset = 0 } = request.query;

  try {
    // 1. Extraer e intentar autenticar candidato si se envía token
    let candidateId = null;
    const authHeader = request.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = request.server.jwt.verify(token);
        if (decoded.role === 'aplicante' || decoded.role === 'candidate') {
          candidateId = decoded.user_id;
        }
      } catch (err) {
        request.log.error(err, 'Error decoding candidate token in getPublicJobs');
      }
    }

    // 2. Si hay candidato autenticado, buscar su perfil en la base de datos
    let candidateProfile = null;
    if (candidateId) {
      const rows = await sequelize.query(`
        SELECT cp.id, cp.location, cp.headline,
               ARRAY_AGG(s.name) FILTER (WHERE s.name IS NOT NULL) as skills
        FROM candidate_profiles cp
        LEFT JOIN candidate_skills cs ON cs.profile_id = cp.id
        LEFT JOIN skills s ON s.id = cs.skill_id
        WHERE cp.candidate_id = :candidateId
        GROUP BY cp.id, cp.location, cp.headline
        ORDER BY cp."updatedAt" DESC
        LIMIT 1
      `, {
        replacements: { candidateId },
        type: sequelize.QueryTypes.SELECT
      });
      if (rows && rows.length > 0) {
        candidateProfile = rows[0];
      }
    }

    // 3. Obtener vacantes del tenant
    const jobs = await Job.findAll({
      where: { tenant_id, status: 'published' },
      include: [{ model: Department, attributes: ['name'] }],
      attributes: ['id', 'public_token', 'title', 'description', 'requirements', 'location', 'contract_type', 'experience_level', 'salary_min', 'salary_max', 'currency', 'salary_negotiable', 'closes_at', 'createdAt'],
    });

    let mappedJobs = jobs.map(job => {
      const jobJson = job.toJSON();
      if (candidateProfile) {
        // Calcular Match Score Heurístico
        let score = 55; // Base inicial

        // 1. Comparación por título / headline
        const jobTitle = (jobJson.title || '').toLowerCase();
        const headline = (candidateProfile.headline || '').toLowerCase();
        if (jobTitle && headline) {
          if (jobTitle.includes(headline) || headline.includes(jobTitle)) {
            score += 15;
          }
        }

        // 2. Habilidades
        const candidateSkills = candidateProfile.skills || [];
        const jobRequirements = (jobJson.requirements || '').toLowerCase();
        const jobDescription = (jobJson.description || '').toLowerCase();
        
        let matchedSkills = 0;
        candidateSkills.forEach(skillName => {
          const lowerSkill = (skillName || '').toLowerCase();
          if (lowerSkill && (jobRequirements.includes(lowerSkill) || jobDescription.includes(lowerSkill))) {
            matchedSkills++;
          }
        });

        score += Math.min(matchedSkills * 8, 25);

        // 3. Ubicación (Fallback a 'managua' si la vacante no tiene ubicación)
        const candidateLoc = (candidateProfile.location || '').toLowerCase();
        const jobLoc = (jobJson.location || 'managua').toLowerCase();
        if (candidateLoc && jobLoc && (candidateLoc.includes(jobLoc) || jobLoc.includes(candidateLoc))) {
          score += 10;
        }

        const finalScore = Math.min(score, 98);
        jobJson.match = `Compatibilidad: ${finalScore}%`;
        jobJson.match_score = finalScore;
      }
      return jobJson;
    });

    // 4. Ordenar por match_score si hay perfil, de lo contrario por fecha
    if (candidateProfile) {
      mappedJobs.sort((a, b) => b.match_score - a.match_score);
    } else {
      mappedJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = mappedJobs.length;
    const paginated = mappedJobs.slice(offset, offset + limit);

    return reply.send({ total, limit, offset, data: paginated });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: `Database error: ${error.message}` });
  }
};

// GET /jobs/stats  — dashboard de stats básicas
exports.getStats = async (request, reply) => {
  const tenant_id = request.user.company_id;

  try {
    const [total, published, paused, closed, draft] = await Promise.all([
      Job.count({ where: { tenant_id } }),
      Job.count({ where: { tenant_id, status: 'published' } }),
      Job.count({ where: { tenant_id, status: 'paused' } }),
      Job.count({ where: { tenant_id, status: 'closed' } }),
      Job.count({ where: { tenant_id, status: 'draft' } }),
    ]);

    return reply.send({ total, published, paused, closed, draft });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: `Database error: ${error.message}` });
  }
};
