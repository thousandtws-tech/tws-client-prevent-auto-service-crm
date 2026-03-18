import { alpha, createTheme, responsiveFontSizes } from "@mui/material/styles";
import type { PaletteMode, ThemeOptions } from "@mui/material";

const FONT_BODY = '"Manrope", "Segoe UI", sans-serif';
const FONT_DISPLAY = '"Space Grotesk", "Manrope", sans-serif';
const BRAND = {
  primary: "#f8c400",
  primarySoft: "#f5d700",
  primaryBright: "#ffec00",
  white: "#f8f8f9",
  dark: "#050505",
  darkSoft: "#111111",
  text: "#231a0f",
  textMuted: "#6f6458",
} as const;

const createAppTheme = (mode: PaletteMode) => {
  const isDark = mode === "dark";

  const palette = {
    mode,
    primary: {
      main: BRAND.primary,
      light: BRAND.primaryBright,
      dark: BRAND.primarySoft,
      contrastText: "#1d1608",
    },
    secondary: {
      main: BRAND.primarySoft,
      light: BRAND.primaryBright,
      dark: BRAND.primary,
      contrastText: "#1d1608",
    },
    success: {
      main: isDark ? "#6fcf97" : "#1e8e5a",
    },
    warning: {
      main: BRAND.primaryBright,
    },
    error: {
      main: isDark ? "#ff7e72" : "#c94538",
    },
    background: {
      default: isDark ? BRAND.dark : "#f8f8f9",
      paper: isDark ? BRAND.darkSoft : "#fffdf7",
    },
    text: {
      primary: isDark ? "#f6eddc" : BRAND.text,
      secondary: isDark ? "#cabca8" : BRAND.textMuted,
    },
    divider: isDark
      ? alpha(BRAND.white, 0.12)
      : alpha(BRAND.textMuted, 0.16),
  } satisfies ThemeOptions["palette"];

  const theme = createTheme({
    palette,
    shape: {
      borderRadius: 4,
    },
    spacing: 10,
    typography: {
      fontFamily: FONT_BODY,
      h1: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        letterSpacing: "-0.04em",
      },
      h2: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        letterSpacing: "-0.04em",
      },
      h3: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        letterSpacing: "-0.035em",
      },
      h4: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        letterSpacing: "-0.03em",
      },
      h5: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        letterSpacing: "-0.025em",
      },
      h6: {
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      subtitle1: {
        fontWeight: 700,
      },
      subtitle2: {
        fontWeight: 700,
      },
      body1: {
        lineHeight: 1.7,
      },
      body2: {
        lineHeight: 1.65,
      },
      button: {
        fontFamily: FONT_BODY,
        fontWeight: 700,
        textTransform: "none",
        letterSpacing: "-0.01em",
      },
      overline: {
        fontFamily: FONT_BODY,
        fontWeight: 700,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": {
            "--app-shell-max-width": "1440px",
            "--app-page-gutter": "clamp(14px, 3vw, 28px)",
            "--app-safe-top": "env(safe-area-inset-top, 0px)",
            "--app-safe-right": "env(safe-area-inset-right, 0px)",
            "--app-safe-bottom": "env(safe-area-inset-bottom, 0px)",
            "--app-safe-left": "env(safe-area-inset-left, 0px)",
          },
          html: {
            fontSize: "clamp(14px, 0.2vw + 13px, 18px)",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            WebkitTextSizeAdjust: "100%",
            textSizeAdjust: "100%",
            scrollBehavior: "smooth",
            overflowX: "hidden",
          },
          body: {
            minWidth: 320,
            minHeight: "100vh",
            overflowX: "hidden",
            background: isDark
              ? "linear-gradient(180deg, #050505 0%, #0a0a0a 52%, #111111 100%)"
              : "radial-gradient(circle at top left, rgba(248,196,0,0.16), transparent 20%), linear-gradient(180deg, #fbfaf6 0%, #f8f8f9 48%, #fffdf7 100%)",
            color: palette.text?.primary,
            overscrollBehaviorX: "none",
          },
          "#root": {
            minHeight: "100vh",
            isolation: "isolate",
          },
          "main.MuiBox-root": {
            backgroundColor: "transparent",
          },
          "*, *::before, *::after": {
            boxSizing: "border-box",
          },
          "img, svg, video, canvas": {
            display: "block",
            maxWidth: "100%",
          },
          "input, textarea, select, button": {
            font: "inherit",
          },
          "@media (max-width:600px)": {
            "input, textarea, select, .MuiInputBase-input, .MuiSelect-select": {
              fontSize: "16px !important",
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backdropFilter: "blur(18px)",
            boxShadow: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          rounded: {
            borderRadius: 14,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${alpha(
              isDark ? BRAND.white : BRAND.textMuted,
              isDark ? 0.08 : 0.1,
            )}`,
            backgroundColor: alpha(
              isDark ? "#141414" : BRAND.white,
              isDark ? 0.92 : 0.92,
            ),
            boxShadow: isDark
              ? "0 14px 32px rgba(0, 0, 0, 0.22)"
              : "0 14px 30px rgba(70, 53, 24, 0.06)",
            overflow: "hidden",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: 46,
            borderRadius: 10,
            paddingInline: 18,
          },
          sizeSmall: {
            minHeight: 38,
            borderRadius: 9,
            paddingInline: 14,
          },
          contained: {
            boxShadow: isDark
              ? "0 10px 24px rgba(248, 196, 0, 0.22)"
              : "0 10px 24px rgba(248, 196, 0, 0.16)",
          },
          outlined: {
            borderWidth: 1,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
          },
          labelSmall: {
            lineHeight: "18px",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: alpha(
              isDark ? BRAND.white : "#fffefb",
              isDark ? 0.05 : 0.84,
            ),
            transition:
              "border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(
                isDark ? BRAND.white : BRAND.textMuted,
                isDark ? 0.16 : 0.2,
              ),
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(palette.primary?.main ?? BRAND.primary, 0.6),
            },
            "&.Mui-focused": {
              backgroundColor: alpha(
                isDark ? "#2b241d" : "#fffdf9",
                isDark ? 0.96 : 0.96,
              ),
              boxShadow: `0 0 0 3px ${alpha(palette.primary?.main ?? BRAND.primary, 0.1)}`,
            },
          },
          input: {
            paddingTop: 14,
            paddingBottom: 14,
          },
          inputSizeSmall: {
            paddingTop: 12,
            paddingBottom: 12,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginLeft: 2,
            marginTop: 6,
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          regular: {
            minHeight: "auto",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            borderRight: `1px solid ${alpha(
              isDark ? BRAND.white : BRAND.textMuted,
              isDark ? 0.1 : 0.1,
            )}`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: 48,
            borderRadius: 10,
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            minWidth: 28,
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 14,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontFamily: FONT_DISPLAY,
            fontSize: "0.82rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            color: palette.text?.secondary,
            backgroundColor: alpha(
              isDark ? BRAND.white : BRAND.textMuted,
              isDark ? 0.04 : 0.05,
            ),
          },
          root: {
            borderBottomColor: alpha(
              isDark ? BRAND.white : BRAND.textMuted,
              isDark ? 0.08 : 0.08,
            ),
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            width: "min(calc(100% - 24px), 1080px)",
            borderRadius: 18,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            border: `1px solid ${alpha(
              isDark ? BRAND.white : BRAND.textMuted,
              isDark ? 0.1 : 0.1,
            )}`,
            boxShadow: isDark
              ? "0 14px 32px rgba(0, 0, 0, 0.22)"
              : "0 14px 30px rgba(70, 53, 24, 0.08)",
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            minHeight: "unset",
            display: "flex",
            alignItems: "center",
          },
        },
      },
      MuiTypography: {
        defaultProps: {
          variant: "body2",
        },
      },
    },
  });

  return responsiveFontSizes(theme, {
    factor: 2.1,
    breakpoints: ["sm", "md", "lg"],
  });
};

const LightThemeWithResponsiveFontSizes = createAppTheme("light");
const DarkThemeWithResponsiveFontSizes = createAppTheme("dark");

export { LightThemeWithResponsiveFontSizes, DarkThemeWithResponsiveFontSizes };
