import { useEffect, useMemo, useState } from "react";
import { useNotification } from "@refinedev/core";
import Grid from "@mui/material/Grid2";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useNavigate } from "react-router";
import { Card, RefineListView } from "../../components";
import {
  SERVICE_ORDER_CHECKLISTS_STORAGE_KEY,
  SERVICE_ORDER_CHECKLISTS_UPDATED_EVENT,
  createServiceOrderChecklist,
  listServiceOrderChecklists,
  removeServiceOrderChecklist,
  updateServiceOrderChecklist,
  type ServiceOrderChecklistItem,
  type ServiceOrderChecklistStatus,
} from "../../services/serviceOrderChecklists";

type ChecklistFormState = {
  label: string;
  status: ServiceOrderChecklistStatus;
};

const DEFAULT_FORM_STATE: ChecklistFormState = {
  label: "",
  status: "active",
};

const STATUS_META: Record<
  ServiceOrderChecklistStatus,
  { label: string; color: "success" | "default" }
> = {
  active: {
    label: "Ativo",
    color: "success",
  },
  inactive: {
    label: "Inativo",
    color: "default",
  },
};

const formatDateTime = (value: string) =>
  value ? new Date(value).toLocaleString("pt-BR") : "-";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Erro inesperado";
};

const CHECKLIST_TABLE_SCROLL_SX = {
  maxHeight: 560,
  overflowY: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "var(--mui-palette-primary-main) rgba(255, 255, 255, 0.08)",
  "&::-webkit-scrollbar": {
    width: 6,
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "primary.main",
    borderRadius: 999,
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
  },
} as const;

export const ServiceOrderChecklistsPage: React.FC = () => {
  const { open } = useNotification();
  const navigate = useNavigate();
  const [items, setItems] = useState<ServiceOrderChecklistItem[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | ServiceOrderChecklistStatus
  >("all");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ChecklistFormState>(DEFAULT_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(editingItemId);

  const loadItems = () => {
    setItems(listServiceOrderChecklists());
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const refresh = () => {
      loadItems();
    };

    const handleChecklistsUpdated: EventListener = () => {
      refresh();
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === SERVICE_ORDER_CHECKLISTS_STORAGE_KEY) {
        refresh();
      }
    };

    window.addEventListener(
      SERVICE_ORDER_CHECKLISTS_UPDATED_EVENT,
      handleChecklistsUpdated,
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        SERVICE_ORDER_CHECKLISTS_UPDATED_EVENT,
        handleChecklistsUpdated,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return item.label.toLowerCase().includes(query);
    });
  }, [items, searchValue, statusFilter]);

  const summary = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc.total += 1;
          if (item.status === "active") {
            acc.active += 1;
          }
          if (item.system) {
            acc.system += 1;
          }
          return acc;
        },
        { total: 0, active: 0, system: 0 },
      ),
    [items],
  );

  const resetForm = () => {
    setEditingItemId(null);
    setFormState(DEFAULT_FORM_STATE);
  };

  const setField = <K extends keyof ChecklistFormState>(
    field: K,
    value: ChecklistFormState[K],
  ) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    const label = formState.label.trim();
    if (!label) {
      open?.({
        type: "error",
        message: "Revise o checklist",
        description: "Informe a descrição do item de checklist",
      });
      return;
    }

    try {
      setIsSaving(true);

      if (editingItemId) {
        updateServiceOrderChecklist(editingItemId, {
          label,
          status: formState.status,
        });
        open?.({
          type: "success",
          message: "Checklist atualizado",
        });
      } else {
        createServiceOrderChecklist({
          label,
          status: formState.status,
        });
        open?.({
          type: "success",
          message: "Checklist cadastrado",
        });
      }

      resetForm();
      loadItems();
    } catch (error) {
      open?.({
        type: "error",
        message: "Erro ao salvar checklist",
        description: getErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: ServiceOrderChecklistItem) => {
    setEditingItemId(item.id);
    setFormState({
      label: item.label,
      status: item.status,
    });
  };

  const handleDelete = (item: ServiceOrderChecklistItem) => {
    try {
      removeServiceOrderChecklist(item.id);
      if (editingItemId === item.id) {
        resetForm();
      }

      open?.({
        type: "success",
        message: "Checklist removido com sucesso",
      });
      loadItems();
    } catch (error) {
      open?.({
        type: "error",
        message: "Erro ao remover checklist",
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <RefineListView
      title="Checklist Personalizado"
      headerButtons={() => (
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            startIcon={<NoteAddOutlinedIcon />}
            onClick={() => navigate("/ordem-servico")}
          >
            Abrir OS
          </Button>
        </Stack>
      )}
    >
      <Grid container columns={24} spacing={3}>
        <Grid size={{ xs: 24, lg: 8 }}>
          <Card
            title={isEditing ? "Editar item do checklist" : "Novo item do checklist"}
            icon={<AddBoxOutlinedIcon />}
            cardContentProps={{ sx: { p: 3 } }}
          >
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Cadastre os itens que devem aparecer no checklist de inspeção da
                ordem de serviço.
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Descrição"
                placeholder="Ex.: Estado da bateria"
                value={formState.label}
                onChange={(event) => setField("label", event.target.value)}
              />
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={formState.status}
                onChange={(event) =>
                  setField(
                    "status",
                    event.target.value as ServiceOrderChecklistStatus,
                  )
                }
              >
                <MenuItem value="active">Ativo</MenuItem>
                <MenuItem value="inactive">Inativo</MenuItem>
              </TextField>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={() => {
                    void handleSave();
                  }}
                  disabled={isSaving}
                >
                  {isEditing ? "Salvar Alterações" : "Cadastrar"}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloseOutlinedIcon />}
                  onClick={resetForm}
                >
                  Limpar
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 24, lg: 16 }}>
          <Card
            title="Itens cadastrados"
            icon={<ChecklistOutlinedIcon />}
            cardContentProps={{ sx: { p: 0 } }}
          >
            <Stack spacing={2} sx={{ p: 3, pb: 2 }}>
              <Grid container columns={12} spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Buscar"
                    placeholder="Pesquisar checklist"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Status"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value as "all" | ServiceOrderChecklistStatus,
                      )
                    }
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="active">Ativos</MenuItem>
                    <MenuItem value="inactive">Inativos</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent={{ xs: "flex-start", md: "flex-end" }}
                    sx={{ height: "100%", alignItems: "center", flexWrap: "wrap" }}
                  >
                    <Chip label={`Total: ${summary.total}`} variant="outlined" />
                    <Chip label={`Ativos: ${summary.active}`} color="success" />
                  </Stack>
                </Grid>
              </Grid>
            </Stack>

            <Divider />

            <TableContainer sx={CHECKLIST_TABLE_SCROLL_SX}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ITEM</TableCell>
                    <TableCell>TIPO</TableCell>
                    <TableCell>STATUS</TableCell>
                    <TableCell>ATUALIZADO EM</TableCell>
                    <TableCell align="right">AÇÕES</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.length ? (
                    filteredItems.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2" fontWeight={600}>
                              {item.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {item.id}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant={item.system ? "filled" : "outlined"}
                            label={item.system ? "Padrão" : "Personalizado"}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={STATUS_META[item.status].label}
                            color={STATUS_META[item.status].color}
                            variant={
                              item.status === "active" ? "filled" : "outlined"
                            }
                          />
                        </TableCell>
                        <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<EditOutlinedIcon />}
                              onClick={() => handleEdit(item)}
                            >
                              Editar
                            </Button>
                            {!item.system ? (
                              <Button
                                size="small"
                                color="error"
                                variant="text"
                                startIcon={<DeleteOutlineOutlinedIcon />}
                                onClick={() => handleDelete(item)}
                              >
                                Remover
                              </Button>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 2 }}
                        >
                          Nenhum item encontrado.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </RefineListView>
  );
};
