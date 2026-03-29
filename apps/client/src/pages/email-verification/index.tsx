import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import InputAdornment from "@mui/material/InputAdornment";
import { verifyEmailCode } from "../../services/auth";

const BRAND = {
  base: "#050505",
  panel: "#111111",
  primary: "#f8c400",
  primarySoft: "#f5d700",
  primaryBright: "#ffec00",
  paper: "#0d0d0d",
  text: "#fff6d8",
  textMuted: "#bda85a",
  whiteSoft: "#fff9e8",
} as const;

const statusConfig = {
  pending: {
    title: "Verificação de código pendente",
    description:
      "Seu cadastro foi criado. Agora valide o código enviado por e-mail para liberar o primeiro acesso da oficina.",
    icon: <ScheduleOutlinedIcon sx={{ fontSize: 22 }} />,
    accent: "#7dd3fc",
    background: alpha("#102538", 0.95),
    border: "1px solid rgba(33, 150, 243, 0.26)",
    steps: [
      "Abra o e-mail do responsável cadastrado.",
      "Localize a mensagem de validação da Prevent Auto Center.",
      "Digite o código recebido para concluir a confirmação.",
    ],
  },
  success: {
    title: "Código validado com sucesso",
    description:
      "A conta principal foi confirmada e a oficina já está pronta para o primeiro login.",
    icon: <MarkEmailReadOutlinedIcon sx={{ fontSize: 22 }} />,
    accent: "#86efac",
    background: alpha("#113220", 0.95),
    border: "1px solid rgba(76, 175, 80, 0.28)",
    steps: [
      "A validação do e-mail foi concluída.",
      "O acesso inicial já está liberado.",
      "Você será redirecionado para o login automaticamente.",
    ],
  },
  error: {
    title: "Falha na validação",
    description:
      "Não foi possível validar o código de confirmação com o link informado.",
    icon: <ErrorOutlineOutlinedIcon sx={{ fontSize: 22 }} />,
    accent: "#fca5a5",
    background: alpha("#2b1010", 0.95),
    border: "1px solid rgba(244, 67, 54, 0.26)",
    steps: [
      "Verifique se o link aberto é o mais recente enviado pelo sistema.",
      "Confirme se o cadastro foi concluído com o e-mail correto.",
      "Se necessário, refaça o cadastro para emitir uma nova validação.",
    ],
  },
} as const;

export const EmailVerificationPage: React.FC = () => {
  const searchParams = React.useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const rawStatus = searchParams.get("emailVerification")?.trim() ?? "pending";
  const initialStatus =
    rawStatus === "success" || rawStatus === "error" ? rawStatus : "pending";
  const initialMessage = searchParams.get("message")?.trim() ?? "";
  const parsedUserId = Number(searchParams.get("userId")?.trim() ?? "");
  const workshopSlug = searchParams.get("workshopSlug")?.trim() ?? "";
  const email = searchParams.get("email")?.trim() ?? "";
  const userId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
  const [status, setStatus] = React.useState<"pending" | "success" | "error">(initialStatus);
  const [message, setMessage] = React.useState(initialMessage);
  const [code, setCode] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(4);

  const loginUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set("emailVerification", status);
    if (message) {
      params.set("message", message);
    }
    if (email) {
      params.set("email", email);
    }
    if (workshopSlug) {
      params.set("workshopSlug", workshopSlug);
    }
    return `/login?${params.toString()}`;
  }, [email, message, status, workshopSlug]);

  React.useEffect(() => {
    if (status !== "success") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          window.location.replace(loginUrl);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [loginUrl, status]);

  const config = statusConfig[status];
  const isPending = status === "pending";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId) {
      setStatus("error");
      setMessage("Identificador de verificação não encontrado. Refaça o cadastro.");
      return;
    }

    const normalizedCode = code.replace(/\D/g, "");
    if (normalizedCode.length !== 6) {
      setStatus("error");
      setMessage("Informe o código de 6 dígitos enviado por e-mail.");
      return;
    }

    setIsSubmitting(true);

    try {
      await verifyEmailCode({
        userId,
        code: normalizedCode,
      });

      setStatus("success");
      setMessage("Código confirmado com sucesso. Você já pode entrar no sistema.");
      setSecondsLeft(4);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error && error.message.trim()
          ? error.message
          : "Não foi possível validar o código informado.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${BRAND.base} 0%, ${BRAND.panel} 100%)`,
        bgcolor: BRAND.base,
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 4 },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 960,
          borderRadius: "24px",
          overflow: "hidden",
          border: `1px solid ${alpha(BRAND.primarySoft, 0.3)}`,
          backgroundColor: BRAND.base,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 420px" },
        }}
      >
        <Box
          sx={{
            p: { xs: 3, md: 5 },
            borderRight: { md: `1px solid ${alpha(BRAND.primarySoft, 0.16)}` },
          }}
        >
          <Stack spacing={3}>
            <Box
              component="img"
              src="/logo-branco.svg"
              alt="Prevent Auto Mecânica"
              sx={{ width: 150, height: 90, objectFit: "contain" }}
            />

            <Stack spacing={1.5}>
              <Typography
                variant="overline"
                sx={{
                  color: BRAND.primary,
                  letterSpacing: "0.14em",
                  fontWeight: 700,
                }}
              >
                Validação de acesso
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  color: BRAND.whiteSoft,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  fontSize: { xs: "1.8rem", md: "2.4rem" },
                }}
              >
                {config.title}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: alpha(BRAND.whiteSoft, 0.82),
                  lineHeight: 1.8,
                  maxWidth: 560,
                }}
              >
                {config.description}
              </Typography>
            </Stack>

            <Stack spacing={1.5}>
              {config.steps.map((step, index) => (
                <Box
                  key={step}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "42px 1fr",
                    columnGap: 2,
                    alignItems: "start",
                  }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: BRAND.primarySoft,
                      color: BRAND.base,
                      fontWeight: 800,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography
                    variant="body1"
                    sx={{ color: BRAND.whiteSoft, lineHeight: 1.75, pt: 0.8 }}
                  >
                    {step}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Box>

        <Box
          sx={{
            p: { xs: 3, md: 5 },
            bgcolor: BRAND.paper,
            background:
              "radial-gradient(circle at top left, rgba(248,196,0,0.14), transparent 36%), linear-gradient(180deg, #121212 0%, #090909 100%)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Stack spacing={2.5} sx={{ width: "100%" }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: "16px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: config.accent,
                backgroundColor: alpha(config.accent, 0.12),
                border: `1px solid ${alpha(config.accent, 0.28)}`,
              }}
            >
              {config.icon}
            </Box>

            <Box
              sx={{
                borderRadius: "18px",
                p: 2.5,
                backgroundColor: config.background,
                border: config.border,
              }}
            >
              <Stack spacing={1.5}>
                <Typography
                  variant="subtitle1"
                  sx={{ color: config.accent, fontWeight: 700 }}
                >
                  Status da validação
                </Typography>

                {email ? (
                  <TextField
                    value={email}
                    fullWidth
                    disabled
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        backgroundColor: alpha("#000000", 0.18),
                        color: BRAND.whiteSoft,
                        "& fieldset": {
                          borderColor: alpha(config.accent, 0.22),
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon sx={{ color: alpha(config.accent, 0.88) }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                ) : null}

                {workshopSlug ? (
                  <TextField
                    value={workshopSlug}
                    fullWidth
                    disabled
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        backgroundColor: alpha("#000000", 0.18),
                        color: BRAND.whiteSoft,
                        "& fieldset": {
                          borderColor: alpha(config.accent, 0.22),
                        },
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LoginOutlinedIcon sx={{ color: alpha(config.accent, 0.88) }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                ) : null}

                {message ? (
                  <Alert
                    severity={
                      status === "success"
                        ? "success"
                        : status === "error"
                          ? "error"
                          : "info"
                    }
                    sx={{
                      borderRadius: "12px",
                      backgroundColor: alpha("#000000", 0.18),
                      color: BRAND.whiteSoft,
                      border: `1px solid ${alpha(config.accent, 0.26)}`,
                    }}
                  >
                    {message}
                  </Alert>
                ) : null}

                {isPending ? (
                  <Stack
                    component="form"
                    spacing={1.5}
                    onSubmit={handleSubmit}
                  >
                    <TextField
                      label="Código de verificação"
                      value={code}
                      onChange={(event) => {
                        const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 6);
                        setCode(digitsOnly);
                        setMessage("");
                      }}
                      fullWidth
                      autoFocus
                      inputProps={{
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                        maxLength: 6,
                      }}
                      sx={{
                        "& .MuiInputLabel-root": {
                          color: BRAND.textMuted,
                          fontWeight: 600,
                        },
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "12px",
                          backgroundColor: alpha("#000000", 0.18),
                          color: BRAND.whiteSoft,
                          letterSpacing: "0.22em",
                          fontWeight: 700,
                          "& fieldset": {
                            borderColor: alpha(config.accent, 0.22),
                          },
                          "&.Mui-focused": {
                            boxShadow: `0 0 0 3px ${alpha(config.accent, 0.14)}`,
                            "& fieldset": {
                              borderColor: config.accent,
                            },
                          },
                        },
                      }}
                    />

                    <Typography
                      variant="body2"
                      sx={{ color: BRAND.textMuted, lineHeight: 1.7 }}
                    >
                      Digite o código de 6 dígitos exatamente como foi enviado no e-mail.
                    </Typography>

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isSubmitting}
                      fullWidth
                      sx={{
                        minHeight: 48,
                        borderRadius: "12px",
                        fontWeight: 700,
                        color: BRAND.base,
                        background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primarySoft} 60%, ${BRAND.primaryBright} 100%)`,
                        boxShadow: "none",
                        "&:hover": {
                          background: `linear-gradient(135deg, ${BRAND.primarySoft} 0%, ${BRAND.primary} 55%, ${BRAND.primaryBright} 100%)`,
                          boxShadow: "none",
                        },
                      }}
                    >
                      {isSubmitting ? <CircularProgress size={18} color="inherit" /> : "Validar código"}
                    </Button>
                  </Stack>
                ) : status === "success" ? (
                  <Typography
                    variant="body2"
                    sx={{ color: BRAND.whiteSoft, lineHeight: 1.7 }}
                  >
                    Redirecionando para o login em <strong>{secondsLeft}s</strong>.
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: BRAND.textMuted, lineHeight: 1.7 }}
                  >
                    Corrija o código informado e tente novamente.
                  </Typography>
                )}
              </Stack>
            </Box>

            <Button
              href={loginUrl}
              variant="contained"
              fullWidth
              startIcon={<LoginOutlinedIcon />}
              sx={{
                minHeight: 52,
                borderRadius: "12px",
                fontWeight: 700,
                color: BRAND.base,
                background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primarySoft} 60%, ${BRAND.primaryBright} 100%)`,
                boxShadow: "none",
                "&:hover": {
                  background: `linear-gradient(135deg, ${BRAND.primarySoft} 0%, ${BRAND.primary} 55%, ${BRAND.primaryBright} 100%)`,
                  boxShadow: "none",
                },
              }}
            >
              Ir para login
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};
