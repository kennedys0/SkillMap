import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export default function HomePage() {
  return (
    <Container component="main" maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
      <Paper component="section" variant="outlined" sx={{ p: { xs: 3, md: 5 } }}>
        <Typography component="h1" variant="h3" gutterBottom>
          MOCHI SkillMap
        </Typography>
        <Typography color="text.secondary">
          Discover locally installed skills and match them to a project brief.
        </Typography>
      </Paper>
    </Container>
  );
}
