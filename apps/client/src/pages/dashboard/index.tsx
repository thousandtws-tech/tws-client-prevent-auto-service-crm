import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNotification, useTranslate } from "@refinedev/core";
import { useNavigate } from "react-router";
import Grid from "@mui/material/Grid2";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import IconButton from "@mui/material/IconButton";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { alpha, useTheme } from "@mui/material/styles";
import { BarChart, LineChart, PieChart } from "@mui/x-charts";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

import { RefineListView } from "../../components";
import {
  getDashboardOperationsSnapshot,
  type DashboardOperationsSnapshot,
} from "../../services/dashboardOperationsInsight";
import { listVehiclesApi, readVehicles } from "../../services/vehicles";
import {
  listLaborCatalogItemsApi,
  listPartCatalogItemsApi,
  readServiceOrderCatalogItems,
} from "../../services/serviceOrderCatalog";
import {
  listServiceOrderChecklists,
} from "../../services/serviceOrderChecklists";

dayjs.locale("pt-br");

const withFallback = async <T,>(query: () => Promise<T>, fallback: () => T) => {
  try {
    return await query();
  } catch {
    return fallback();
  }
};

type DashboardExtras = {
  vehiclesTotal: number;
  vehiclesActive: number;
  catalogPartsTotal: number;
  catalogPartsActive: number;
  catalogLaborTotal: number;
  catalogLaborActive: number;
  checklistsTotal: number;
  checklistsActive: number;
};

const formatCompact = (value: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value || 0);

const getDateKey = (value: Date) => dayjs(value).format("YYYY-MM-DD");

const buildDailyBuckets = (
  from: Date,
  days: number,
  entries: Array<{ at: string }>,
) => {
  const start = dayjs(from).startOf("day");
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    buckets.set(start.add(i, "day").format("YYYY-MM-DD"), 0);
  }

  entries.forEach((entry) => {
    const date = new Date(entry.at);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    const key = getDateKey(date);
    if (!buckets.has(key)) {
      return;
    }
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  const labels: string[] = [];
  const values: number[] = [];

  [...buckets.entries()].forEach(([key, value]) => {
    labels.push(dayjs(key).format("DD/MM"));
    values.push(value);
  });

  return { labels, values };
};

type KpiCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "error";
  onClick?: () => void;
};

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  tone = "neutral",
  onClick,
}) => {
  const theme = useTheme();
  const color =
    tone === "success"
      ? theme.palette.success.main
      : tone === "warning"
        ? theme.palette.warning.main
        : tone === "error"
          ? theme.palette.error.main
          : theme.palette.primary.main;

  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2.2,
        borderRadius: 3,
        borderColor: alpha(color, 0.2),
        background: `linear-gradient(135deg, ${alpha(color, 0.14)} 0%, ${alpha(
          theme.palette.background.paper,
          0.9,
        )} 52%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 160ms ease, border-color 160ms ease",
        "&:hover": onClick
          ? {
              transform: "translateY(-1px)",
              borderColor: alpha(color, 0.35),
            }
          : undefined,
      }}
    >
      <Stack direction="row" spacing={1.6} alignItems="flex-start">
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.2,
            display: "grid",
            placeItems: "center",
            color,
            backgroundColor: alpha(color, 0.14),
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {title}
          </Typography>
          <Typography fontWeight={800} sx={{ fontSize: 22, lineHeight: 1.25 }}>
            {value}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
};

export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const t = useTranslate();
  const { open } = useNotification();
  const navigate = useNavigate();

  const [snapshot, setSnapshot] = useState<DashboardOperationsSnapshot | null>(null);
  const [extras, setExtras] = useState<DashboardExtras | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const nextSnapshot = await getDashboardOperationsSnapshot();
      setSnapshot(nextSnapshot);

      const [vehicles, catalog, checklists] = await Promise.all([
        withFallback(listVehiclesApi, readVehicles),
        (async () => {
          const items = await withFallback(
            async () => {
              const [parts, labor] = await Promise.all([
                listPartCatalogItemsApi(),
                listLaborCatalogItemsApi(),
              ]);
              return [...parts, ...labor];
            },
            readServiceOrderCatalogItems,
          );
          return items;
        })(),
        Promise.resolve(listServiceOrderChecklists()),
      ]);

      const vehiclesActive = vehicles.filter((vehicle) => vehicle.status === "active").length;
      const catalogParts = catalog.filter((item) => item.type === "part");
      const catalogLabor = catalog.filter((item) => item.type === "labor");

      setExtras({
        vehiclesTotal: vehicles.length,
        vehiclesActive,
        catalogPartsTotal: catalogParts.length,
        catalogPartsActive: catalogParts.filter((item) => item.status === "active").length,
        catalogLaborTotal: catalogLabor.length,
        catalogLaborActive: catalogLabor.filter((item) => item.status === "active").length,
        checklistsTotal: checklists.length,
        checklistsActive: checklists.filter((item) => item.status === "active").length,
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Falha ao carregar dashboard",
        description: error instanceof Error ? error.message : "Erro inesperado",
      });
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = snapshot?.summary ?? null;

  const serviceOrderStatus = useMemo(() => {
    const orders = snapshot?.dataset.serviceOrders ?? [];
    const counts = orders.reduce(
      (acc, order) => {
        acc[order.status] += 1;
        return acc;
      },
      {
        registered: 0,
        sent_for_signature: 0,
        signed: 0,
      },
    );

    return [
      { id: 0, label: "Cadastradas", value: counts.registered, color: theme.palette.info.main },
      {
        id: 1,
        label: "Aguardando assinatura",
        value: counts.sent_for_signature,
        color: theme.palette.warning.main,
      },
      { id: 2, label: "Assinadas", value: counts.signed, color: theme.palette.success.main },
    ];
  }, [snapshot?.dataset.serviceOrders, theme.palette.info.main, theme.palette.success.main, theme.palette.warning.main]);

  const signatureStatus = useMemo(() => {
    const shared = snapshot?.dataset.sharedOrders ?? [];
    const pending = shared.filter((item) => item.status !== "signed").length;
    const signed = shared.filter((item) => item.status === "signed").length;
    return [
      { id: 0, label: "Pendentes", value: pending, color: theme.palette.warning.main },
      { id: 1, label: "Assinadas", value: signed, color: theme.palette.success.main },
    ];
  }, [snapshot?.dataset.sharedOrders, theme.palette.success.main, theme.palette.warning.main]);

  const next14DaysAppointments = useMemo(() => {
    const from = new Date();
    const to = dayjs(from).add(14, "day").endOf("day").toDate();
    const appointments =
      snapshot?.dataset.appointments.filter((item) => {
        const start = new Date(item.schedule.startAt);
        return !Number.isNaN(start.getTime()) && start >= from && start <= to;
      }) ?? [];
    return buildDailyBuckets(from, 14, appointments.map((item) => ({ at: item.schedule.startAt })));
  }, [snapshot?.dataset.appointments]);

  const last30DaysRevenue = useMemo(() => {
    const from = dayjs().subtract(29, "day").startOf("day").toDate();
    const orders = snapshot?.dataset.serviceOrders ?? [];
    const entries = orders
      .filter((order) => {
        const at = new Date(order.updatedAt);
        return !Number.isNaN(at.getTime()) && at >= from;
      })
      .map((order) => ({ at: order.updatedAt, value: Math.max(0, order.totals.grandTotal) }));

    const start = dayjs(from).startOf("day");
    const buckets = new Map<string, number>();
    for (let i = 0; i < 30; i += 1) {
      buckets.set(start.add(i, "day").format("YYYY-MM-DD"), 0);
    }
    entries.forEach((entry) => {
      const at = new Date(entry.at);
      if (Number.isNaN(at.getTime())) {
        return;
      }
      const key = getDateKey(at);
      if (!buckets.has(key)) {
        return;
      }
      buckets.set(key, (buckets.get(key) ?? 0) + entry.value);
    });

    const labels: string[] = [];
    const values: number[] = [];
    [...buckets.entries()].forEach(([key, value]) => {
      labels.push(dayjs(key).format("DD/MM"));
      values.push(Number(value.toFixed(2)));
    });

    return { labels, values };
  }, [snapshot?.dataset.serviceOrders]);

  return (
    <RefineListView
      canCreate={false}
      title={t("dashboard.title", "Operação")}
      headerButtons={() => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            variant="outlined"
            label={snapshot?.generatedAt ? `Atualizado: ${new Date(snapshot.generatedAt).toLocaleString("pt-BR")}` : "Atualizando..."}
          />
          <IconButton size="small" onClick={() => void refresh()} aria-label="Atualizar">
            <RefreshOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}
    >
      <Stack spacing={3}>
        <Grid container columns={12} spacing={2.2}>
          <Grid size={{ xs: 12, md: 3 }}>
            {loading || !summary ? (
              <Skeleton variant="rounded" height={104} />
            ) : (
              <KpiCard
                title="Clientes"
                value={formatCompact(summary.activeCustomers)}
                subtitle={`${formatCompact(summary.totalCustomers)} cadastrados`}
                icon={<GroupsOutlinedIcon />}
                onClick={() => navigate("/clientes")}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            {loading || !extras ? (
              <Skeleton variant="rounded" height={104} />
            ) : (
              <KpiCard
                title="Veículos"
                value={formatCompact(extras.vehiclesActive)}
                subtitle={`${formatCompact(extras.vehiclesTotal)} cadastrados`}
                icon={<DirectionsCarOutlinedIcon />}
                onClick={() => navigate("/clientes")}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            {loading || !summary ? (
              <Skeleton variant="rounded" height={104} />
            ) : (
              <KpiCard
                title="Agendamentos (7 dias)"
                value={formatCompact(summary.upcomingAppointmentsNext7Days)}
                subtitle={`${formatCompact(summary.totalAppointments)} no histórico`}
                icon={<EventNoteOutlinedIcon />}
                tone={summary.missedPendingAppointments ? "warning" : "neutral"}
                onClick={() => navigate("/agendamentos")}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            {loading || !summary ? (
              <Skeleton variant="rounded" height={104} />
            ) : (
              <KpiCard
                title="Assinaturas pendentes"
                value={formatCompact(summary.pendingSharedOrders)}
                subtitle={`${formatCompact(summary.totalSharedOrders)} links gerados`}
                icon={<DrawOutlinedIcon />}
                tone={summary.pendingSharedOrders ? "warning" : "success"}
                onClick={() => navigate("/service-order-signatures")}
              />
            )}
          </Grid>
        </Grid>

        <Grid container columns={12} spacing={2.2}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper variant="outlined" sx={{ p: 2.2, borderRadius: 3, height: "100%" }}>
              <Stack spacing={1.4}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack spacing={0.2}>
                    <Typography fontWeight={800}>Ordens de serviço</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Distribuição por status (clique para abrir a página)
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ReceiptLongOutlinedIcon />}
                    onClick={() => navigate("/service-order-history")}
                  >
                    Ver histórico
                  </Button>
                </Stack>
                <Divider />
                {loading || !snapshot ? (
                  <Skeleton variant="rounded" height={260} />
                ) : (
                  <PieChart
                    height={260}
                    margin={{ left: 16, right: 16, top: 10, bottom: 10 }}
                    series={[
                      {
                        data: serviceOrderStatus,
                        innerRadius: 58,
                        outerRadius: 95,
                        paddingAngle: 2,
                        cornerRadius: 4,
                      },
                    ]}
                    onItemClick={(_, item) => {
                      if (!item) return;
                      navigate("/service-order-history");
                    }}
                  />
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper variant="outlined" sx={{ p: 2.2, borderRadius: 3, height: "100%" }}>
              <Stack spacing={1.4}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack spacing={0.2}>
                    <Typography fontWeight={800}>Agenda (próximos 14 dias)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Quantidade de agendamentos por dia
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EventNoteOutlinedIcon />}
                    onClick={() => navigate("/agendamentos")}
                  >
                    Abrir agenda
                  </Button>
                </Stack>
                <Divider />
                {loading || !snapshot ? (
                  <Skeleton variant="rounded" height={260} />
                ) : (
                  <BarChart
                    height={260}
                    xAxis={[
                      {
                        id: "days",
                        data: next14DaysAppointments.labels,
                        scaleType: "band",
                      },
                    ]}
                    series={[
                      {
                        data: next14DaysAppointments.values,
                        label: "Agendamentos",
                        color: theme.palette.primary.main,
                      },
                    ]}
                    grid={{ horizontal: true }}
                  />
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Grid container columns={12} spacing={2.2}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper variant="outlined" sx={{ p: 2.2, borderRadius: 3, height: "100%" }}>
              <Stack spacing={1.4}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack spacing={0.2}>
                    <Typography fontWeight={800}>Receita aprovada (30 dias)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Soma do total geral de OS atualizadas no período
                    </Typography>
                  </Stack>
                  <Chip
                    size="small"
                    color="success"
                    variant="outlined"
                    label={
                      summary
                        ? formatCurrency(summary.totalServiceOrdersApprovedValue)
                        : "-"
                    }
                  />
                </Stack>
                <Divider />
                {loading || !snapshot ? (
                  <Skeleton variant="rounded" height={260} />
                ) : (
                  <LineChart
                    height={260}
                    xAxis={[
                      {
                        id: "days",
                        data: last30DaysRevenue.labels,
                        scaleType: "point",
                      },
                    ]}
                    series={[
                      {
                        data: last30DaysRevenue.values,
                        label: "Receita",
                        color: theme.palette.primary.main,
                        area: true,
                      },
                    ]}
                    grid={{ horizontal: true }}
                  />
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper variant="outlined" sx={{ p: 2.2, borderRadius: 3, height: "100%" }}>
              <Stack spacing={1.4}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack spacing={0.2}>
                    <Typography fontWeight={800}>Assinaturas</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Links enviados para clientes
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DrawOutlinedIcon />}
                    onClick={() => navigate("/service-order-signatures")}
                  >
                    Abrir
                  </Button>
                </Stack>
                <Divider />
                {loading || !snapshot ? (
                  <Skeleton variant="rounded" height={260} />
                ) : (
                  <PieChart
                    height={260}
                    margin={{ left: 16, right: 16, top: 10, bottom: 10 }}
                    series={[
                      {
                        data: signatureStatus,
                        innerRadius: 60,
                        outerRadius: 96,
                        paddingAngle: 2,
                        cornerRadius: 4,
                      },
                    ]}
                    onItemClick={() => navigate("/service-order-signatures")}
                  />
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 2.2, borderRadius: 3 }}>
          <Stack spacing={1.4}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack spacing={0.2}>
                <Typography fontWeight={800}>Visão por página</Typography>
                <Typography variant="caption" color="text.secondary">
                  Acesso rápido com indicadores simples
                </Typography>
              </Stack>
            </Stack>
            <Divider />
            <Grid container columns={12} spacing={1.6}>
              <Grid size={{ xs: 12, md: 4 }}>
                <KpiCard
                  title="Cadastro de peças"
                  value={extras ? formatCompact(extras.catalogPartsActive) : "-"}
                  subtitle={
                    extras
                      ? `${formatCompact(extras.catalogPartsTotal)} itens`
                      : undefined
                  }
                  icon={<Inventory2OutlinedIcon />}
                  onClick={() => navigate("/ordem-servico/pecas")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KpiCard
                  title="Cadastro de serviços"
                  value={extras ? formatCompact(extras.catalogLaborActive) : "-"}
                  subtitle={
                    extras
                      ? `${formatCompact(extras.catalogLaborTotal)} itens`
                      : undefined
                  }
                  icon={<HandymanOutlinedIcon />}
                  onClick={() => navigate("/ordem-servico/mao-de-obra")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KpiCard
                  title="Checklist personalizado"
                  value={extras ? formatCompact(extras.checklistsActive) : "-"}
                  subtitle={
                    extras
                      ? `${formatCompact(extras.checklistsTotal)} itens`
                      : undefined
                  }
                  icon={<FactCheckOutlinedIcon />}
                  onClick={() => navigate("/service-order-checklists")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KpiCard
                  title="Serviços recusados"
                  value={summary ? formatCompact(summary.totalRefusedItems) : "-"}
                  subtitle={
                    summary ? formatCurrency(summary.totalRefusedValue) : undefined
                  }
                  icon={<ErrorOutlineOutlinedIcon />}
                  tone={summary && summary.totalRefusedItems ? "warning" : "neutral"}
                  onClick={() => navigate("/service-order-refusals")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KpiCard
                  title="Notificações"
                  value={summary ? formatCompact(summary.unreadNotifications) : "-"}
                  subtitle={
                    summary ? `${formatCompact(summary.totalNotifications)} no total` : undefined
                  }
                  icon={<NotificationsNoneOutlinedIcon />}
                  tone={summary && summary.unreadNotifications ? "warning" : "neutral"}
                  onClick={() => navigate("/settings")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KpiCard
                  title="Configurações"
                  value="Abrir"
                  subtitle="Perfil, backup e branding"
                  icon={<SettingsOutlinedIcon />}
                  onClick={() => navigate("/settings")}
                />
              </Grid>
            </Grid>
          </Stack>
        </Paper>
      </Stack>
    </RefineListView>
  );
};
