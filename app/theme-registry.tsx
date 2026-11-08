"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";

const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#f7f6f2",
      paper: "#ffffff",
    },
    primary: {
      main: "#315c4c",
      light: "#467b66",
      dark: "#203e33",
      contrastText: "#ffffff",
    },
    text: {
      primary: "#1f2421",
      secondary: "#5c6560",
    },
    divider: "#e5e2da",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderColor: "#e5e2da",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export function ThemeRegistry({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
