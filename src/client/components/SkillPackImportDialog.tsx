"use client";

import { useId, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  MAX_SAVED_SKILL_PACKS,
  MAX_SKILL_PACK_IMPORT_BYTES,
  type SkillPackV1,
} from "@/src/contracts/skill-pack";
import {
  parseSkillPackJson,
  type SkillPackValidationIssue,
} from "../packs/validation";
import { CheckIcon, FileIcon, UploadIcon, WarningIcon } from "./Icons";

interface SkillPackImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (pack: SkillPackV1) => void;
  savedPackCount: number;
}

export function SkillPackImportDialog({
  open,
  onClose,
  onImport,
  savedPackCount,
}: SkillPackImportDialogProps) {
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedPack, setParsedPack] = useState<SkillPackV1 | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    SkillPackValidationIssue[]
  >([]);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const titleId = useId();

  const resetState = () => {
    setJsonText("");
    setFileName(null);
    setParsedPack(null);
    setValidationErrors([]);
    setSizeError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processContent = (text: string, name?: string) => {
    setJsonText(text);
    if (name) {
      setFileName(name);
    }
    setSizeError(null);
    setValidationErrors([]);
    setParsedPack(null);

    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const byteLength = new TextEncoder().encode(text).length;
    if (byteLength > MAX_SKILL_PACK_IMPORT_BYTES) {
      setSizeError(
        `Import file/payload exceeds maximum allowed size of 256 KiB (${(
          byteLength / 1024
        ).toFixed(1)} KiB).`,
      );
      return;
    }

    const result = parseSkillPackJson(text);
    if (result.ok) {
      setParsedPack(result.value);
    } else {
      setValidationErrors(result.issues);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SKILL_PACK_IMPORT_BYTES) {
      setFileName(file.name);
      setParsedPack(null);
      setValidationErrors([]);
      setSizeError(
        `File "${file.name}" (${(file.size / 1024).toFixed(
          1,
        )} KiB) exceeds the maximum limit of 256 KiB.`,
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        processContent(content, file.name);
      }
    };
    reader.onerror = () => {
      setSizeError("Failed to read the selected file.");
    };
    reader.readAsText(file, "UTF-8");
    // Reset file input value so re-selecting same file triggers onChange
    e.target.value = "";
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFileName(null);
    processContent(e.target.value);
  };

  const handleConfirmImport = () => {
    if (!parsedPack) return;
    onImport(parsedPack);
    handleClose();
  };

  const isAtPackLimit = savedPackCount >= MAX_SAVED_SKILL_PACKS;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId} sx={{ fontWeight: 700, pb: 1 }}>
        Import Skill Pack
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            Upload a valid <code>.skill-pack.json</code> file or paste a JSON
            manifest below. Manifests are strictly verified client-side (v1
            schema, limits, no markup or credentials).
          </Typography>

          {isAtPackLimit && (
            <Alert severity="warning" icon={<WarningIcon sx={{ fontSize: 20 }} />}>
              You currently have {savedPackCount} saved skill packs (limit is{" "}
              {MAX_SAVED_SKILL_PACKS}). Importing will replace any existing pack
              with the same ID, or remain in-memory if a new pack cannot be
              persisted.
            </Alert>
          )}

          {/* File Picker */}
          <Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon sx={{ fontSize: 18 }} />}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Choose JSON File
              <input
                type="file"
                accept=".json,application/json"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            {fileName && (
              <Typography
                variant="caption"
                sx={{ ml: 1.5, color: "text.secondary", fontFamily: "monospace" }}
              >
                Selected: {fileName}
              </Typography>
            )}
          </Box>

          <Divider>
            <Typography variant="caption" color="text.secondary">
              OR PASTE JSON MANIFEST
            </Typography>
          </Divider>

          {/* Text Area */}
          <TextField
            multiline
            rows={6}
            fullWidth
            placeholder='{\n  "schemaVersion": 1,\n  "id": "...",\n  "name": "...",\n  "projectDescription": "...",\n  "selections": []\n}'
            value={jsonText}
            onChange={handleTextChange}
            slotProps={{
              htmlInput: {
                "aria-label": "Paste Skill Pack JSON Manifest",
                style: { fontFamily: "monospace", fontSize: "0.825rem" },
              },
            }}
          />

          {/* Size Error */}
          {sizeError && (
            <Alert
              severity="error"
              icon={<WarningIcon sx={{ fontSize: 20 }} />}
            >
              {sizeError}
            </Alert>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert
              severity="error"
              icon={<WarningIcon sx={{ fontSize: 20 }} />}
              sx={{ maxHeight: 200, overflowY: "auto" }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Invalid Skill Pack Manifest ({validationErrors.length}{" "}
                {validationErrors.length === 1 ? "issue" : "issues"} found):
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                {validationErrors.map((issue, idx) => (
                  <Typography
                    key={idx}
                    component="li"
                    variant="caption"
                    sx={{ display: "list-item", py: 0.25 }}
                  >
                    <strong>{issue.path}:</strong> {issue.message}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}

          {/* Successful Validation Preview */}
          {parsedPack && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: "#f7faf8",
                borderColor: "primary.main",
              }}
            >
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <CheckIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, color: "primary.dark" }}
                  >
                    Valid Skill Pack Preview
                  </Typography>
                </Stack>

                <Box>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 700, color: "text.primary" }}
                  >
                    {parsedPack.name}
                  </Typography>
                  {parsedPack.projectDescription ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {parsedPack.projectDescription}
                    </Typography>
                  ) : (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontStyle: "italic" }}
                    >
                      No project description provided.
                    </Typography>
                  )}
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}
                >
                  <Chip
                    size="small"
                    label={`${parsedPack.selections.length} ${
                      parsedPack.selections.length === 1
                        ? "skill selection"
                        : "skill selections"
                    }`}
                    sx={{
                      fontWeight: 600,
                      backgroundColor: "#e8f0eb",
                      color: "#1c4a38",
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    UUID: {parsedPack.id}
                  </Typography>
                </Stack>

                {parsedPack.selections.length > 0 && (
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2ded5",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: "text.primary", display: "block", mb: 0.5 }}
                    >
                      Contained Skills (first {Math.min(parsedPack.selections.length, 5)}):
                    </Typography>
                    <Stack spacing={0.5}>
                      {parsedPack.selections.slice(0, 5).map((sel, idx) => (
                        <Stack
                          key={idx}
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: "center" }}
                        >
                          <FileIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: "text.primary" }}
                          >
                            {sel.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            ({sel.role}) · {sel.sourceId}
                          </Typography>
                        </Stack>
                      ))}
                      {parsedPack.selections.length > 5 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontStyle: "italic" }}
                        >
                          ...and {parsedPack.selections.length - 5} more skills.
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirmImport}
          disabled={!parsedPack}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Import Pack
        </Button>
      </DialogActions>
    </Dialog>
  );
}
