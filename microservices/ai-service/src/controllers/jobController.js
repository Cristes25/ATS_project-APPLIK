const asyncHandler = require('express-async-handler')
const jobService = require ('../services/jobService')

/**
 * @desc Genera una descripcion de trabajo alineado con la cultura de una empresa obtenido de una URL 
 * @route POST api/v1/jobs/generate-description
 * @access Private 
 * 
 */

const generateJobDescription = asyncHandler (async (req,res)=>{
    const {jobTitle, companyUrl, requirements} = req.body 
    if (!jobTitle||!companyUrl) {
        res.status(400)
        throw new Error ("JobTitle y companyURL son necesarios en el cuerpo de la solicitud")
    }
    //1. Obtener la cultura de la empresa desde la URL
    const cultureText = await jobService.scrapeCompanyCulture(companyUrl)
    //2. Generar descripcion de trabajo basado en la cultura obtenida y los requisitos
    const jobDescription = await jobService.generateDescription(jobTitle, cultureText, requirements)
    res.status(201).json({
        message: " Descripcion de puesto generada correctamente ",
        description: jobDescription
    })
})

module.exports = {
    generateJobDescription
};