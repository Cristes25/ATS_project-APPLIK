import { apiFetch } from "./client"

const AUTH = `${import.meta.env.VITE_AUTH_SERVICE_URL}/api/v1/auth`

export const login = (email, password) =>
  apiFetch(`${AUTH}/login`, {
    auth: false,
    method: "POST",
    body: JSON.stringify({ email, password }),
  })

export const registerApplicant = ({ email, password, first_name, last_name }) =>
  apiFetch(`${AUTH}/register`, {
    auth: false,
    method: "POST",
    body: JSON.stringify({ email, password, first_name, last_name, law_787_accepted: true }),
  })

export const registerOrganization = ({ businessName, RUC, adminEmail, first_name, last_name, password }) =>
  apiFetch(`${AUTH}/organizations/register`, {
    auth: false,
    method: "POST",
    body: JSON.stringify({ businessName, RUC, adminEmail, first_name, last_name, password, law_787_accepted: true }),
  })

export const forgotPassword = (email) =>
  apiFetch(`${AUTH}/forgot-password`, {
    auth: false,
    method: "POST",
    body: JSON.stringify({ email }),
  })

export const resetPassword = (token, newPassword) =>
  apiFetch(`${AUTH}/reset-password`, {
    auth: false,
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  })

export const acceptInvitation = ({ token, email, password, first_name, last_name, law_787_accepted }) =>
  apiFetch(`${AUTH}/invitations/accept`, {
    auth: false,
    method: "POST",
    body: JSON.stringify({ token, email, password, first_name, last_name, law_787_accepted }),
  })

export const getMe = () =>
  apiFetch(`${AUTH}/me`)

export const logoutApi = () =>
  apiFetch(`${AUTH}/logout`, { method: "POST" })

export const updateMe = ({ first_name, last_name }) =>
  apiFetch(`${AUTH}/me`, {
    method: "PATCH",
    body: JSON.stringify({ first_name, last_name }),
  })

export const changePassword = ({ currentPassword, newPassword }) =>
  apiFetch(`${AUTH}/change-password`, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  })

export const createInvitation = (email) =>
  apiFetch(`${AUTH}/invitations/create`, {
    method: "POST",
    body: JSON.stringify({ email }),
  })
