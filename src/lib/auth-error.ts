export function mapAuthErrorMessage(rawMessage: string, t: (key: string) => string) {
  const message = rawMessage.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return t("auth.invalidCredentials");
  }

  if (message.includes("email not confirmed")) {
    return t("auth.emailNotConfirmed");
  }

  if (message.includes("already been registered")) {
    return t("auth.userExists");
  }

  if (message.includes("provider is not enabled") || message.includes("unsupported provider")) {
    return t("auth.providerUnavailable");
  }

  return rawMessage;
}

export function mapAuthErrorCode(code: string | undefined, t: (key: string) => string) {
  switch (code) {
    case "invalid_email":
      return t("auth.invalidEmail");
    case "password_too_short":
      return t("auth.passwordTooShort");
    case "password_compromised":
      return t("auth.passwordCompromised");
    case "user_exists":
      return t("auth.userExists");
    default:
      return t("auth.authUnexpected");
  }
}
