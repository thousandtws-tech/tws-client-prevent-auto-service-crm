import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslate } from "@refinedev/core";
import { BarChart, Gauge, LineChart, PieChart, SparkLineChart } from "@mui/x-charts";
import { gaugeClasses } from "@mui/x-charts/Gauge";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/pt-br";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { alpha, useTheme, type SxProps, type Theme } from "@mui/material/styles";
import { OperationsInsightPanel } from "../../components/dashboard";
import { RefineListView } from "../../components";
import type { DateFilter } from "../../interfaces";
import {
  getDashboardOperationsSnapshot,
  type DashboardOperationsSnapshot,
} from "../../services/dashboardOperationsInsight";

dayjs.locale("pt-br");

const DATE_FILTERS: Record<DateFilter, { value: DateFilter; labelKey: string; label: string }> = {
  lastWeek: {
    value: "lastWeek",
    labelKey: "dashboard.filter.date.lastWeek",
    label: "Última semana",
  },
  lastMonth: {
    value: "lastMonth",
    labelKey: "dashboard.filter.date.lastMonth",
    label: "Último mês",
  },
};

const ORDER_STATUS_LABEL = {
  registered: "Registrada",
  sent_for_signature: "Aguardando assinatura",
  signed: "Assinada",
} as const;

const APPOINTMENT_STATUS_LABEL = {
  pending: "Pendente",
  confirmed: "Confirmado",
  failed: "Com falha",
  canceled: "Cancelado",
} as const;

type NumericPoint = {
  date: string;
  value: number;
};

type TimeBucket = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  customers: number;
  appointments: number;
  pendingSignatures: number;
  errorNotifications: number;
};

type MetricSummary = {
  total: number;
  trend: number;
  points: number[];
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  at: string;
  tone: "success" | "warning" | "error" | "default";
};

type RecentOrderItem = {
  id: string;
  orderNumber: string;
  customerName: string;
  vehicle: string;
  updatedAt: string;
  total: number;
  status: keyof typeof ORDER_STATUS_LABEL;
};

type MetricCardTone = "gold" | "success" | "warning" | "danger" | "neutral";

type MetricCardProps = {
  label: string;
  value: string;
  caption: string;
  trend: number;
  trendMode: "currency" | "count";
  accent: MetricCardTone;
  icon: ReactNode;
  data: number[];
};

type PremiumPanelProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  accent?: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("pt-BR");
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const toPercentage = (value: number, total: number) =>
  total > 0 ? clamp((value / total) * 100) : 0;

const buildRangeFromFilter = (filter: DateFilter) => {
  const now = dayjs();

  if (filter === "lastMonth") {
    return {
      start: now.subtract(1, "month").startOf("day"),
      end: now.endOf("day"),
    };
  }

  return {
    start: now.subtract(6, "day").startOf("day"),
    end: now.endOf("day"),
  };
};

const createDateBuckets = (start: Dayjs, end: Dayjs) => {
  const buckets = new Map<string, TimeBucket>();
  let cursor = start.startOf("day");
  const finalDay = end.startOf("day");

  while (cursor.isBefore(finalDay) || cursor.isSame(finalDay)) {
    const key = cursor.format("YYYY-MM-DD");
    buckets.set(key, {
      date: key,
      label: cursor.format("DD/MM"),
      revenue: 0,
      orders: 0,
      customers: 0,
      appointments: 0,
      pendingSignatures: 0,
      errorNotifications: 0,
    });
    cursor = cursor.add(1, "day");
  }

  return buckets;
};

const addPointToBucket = (
  buckets: Map<string, TimeBucket>,
  rawDate: string,
  updater: (bucket: TimeBucket) => void,
) => {
  const parsed = dayjs(rawDate);
  if (!parsed.isValid()) {
    return;
  }

  const key = parsed.startOf("day").format("YYYY-MM-DD");
  const bucket = buckets.get(key);
  if (!bucket) {
    return;
  }

  updater(bucket);
};

const buildMetricSummary = (
  filter: DateFilter,
  points: NumericPoint[],
  currentBuckets: TimeBucket[],
  key: keyof Pick<
    TimeBucket,
    "revenue" | "orders" | "customers" | "appointments" | "pendingSignatures" | "errorNotifications"
  >,
): MetricSummary => {
  const current = buildRangeFromFilter(filter);
  const currentTotal = currentBuckets.reduce((total, bucket) => total + bucket[key], 0);

  const periodDays = Math.max(1, current.end.diff(current.start, "day") + 1);
  const previousEnd = current.start.subtract(1, "millisecond");
  const previousStart = previousEnd.subtract(periodDays - 1, "day").startOf("day");

  const previousTotal = points.reduce((total, point) => {
    const parsed = dayjs(point.date);
    if (!parsed.isValid()) {
      return total;
    }

    if (parsed.isBefore(previousStart) || parsed.isAfter(previousEnd)) {
      return total;
    }

    return total + point.value;
  }, 0);

  return {
    total: currentTotal,
    trend: currentTotal - previousTotal,
    points: currentBuckets.map((bucket) => bucket[key]),
  };
};

const buildTimeBuckets = (
  snapshot: DashboardOperationsSnapshot | null,
  filter: DateFilter,
): TimeBucket[] => {
  const { start, end } = buildRangeFromFilter(filter);
  const buckets = createDateBuckets(start, end);

  if (!snapshot) {
    return [...buckets.values()];
  }

  snapshot.dataset.serviceOrders.forEach((order) => {
    addPointToBucket(buckets, order.updatedAt, (bucket) => {
      bucket.revenue += Math.max(0, order.totals.grandTotal);
      bucket.orders += 1;
    });

    if (order.status !== "signed" && (order.status === "sent_for_signature" || order.signature)) {
      addPointToBucket(buckets, order.updatedAt, (bucket) => {
        bucket.pendingSignatures += 1;
      });
    }
  });

  snapshot.dataset.sharedOrders.forEach((order) => {
    if (order.status !== "signed") {
      addPointToBucket(buckets, order.createdAt, (bucket) => {
        bucket.pendingSignatures += 1;
      });
    }
  });

  snapshot.dataset.customers.forEach((customer) => {
    addPointToBucket(buckets, customer.createdAt, (bucket) => {
      bucket.customers += 1;
    });
  });

  snapshot.dataset.appointments.forEach((appointment) => {
    addPointToBucket(buckets, appointment.schedule.startAt, (bucket) => {
      bucket.appointments += 1;
    });
  });

  snapshot.dataset.notifications
    .filter((item) => item.type === "error")
    .forEach((item) => {
      addPointToBucket(buckets, item.createdAt, (bucket) => {
        bucket.errorNotifications += 1;
      });
    });

  return [...buckets.values()];
};

const buildActivityItems = (snapshot: DashboardOperationsSnapshot | null): ActivityItem[] => {
  if (!snapshot) {
    return [];
  }

  const serviceOrderEvents: ActivityItem[] = snapshot.dataset.serviceOrders
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5)
    .map((order) => ({
      id: `order-${order.id}`,
      title: `OS ${order.orderInfo.orderNumber || order.id.slice(0, 8)}`,
      description: `${ORDER_STATUS_LABEL[order.status]} • ${order.orderInfo.customerName || "Cliente não informado"}`,
      at: order.updatedAt,
      tone:
        order.status === "signed"
          ? "success"
          : order.status === "sent_for_signature"
            ? "warning"
            : "default",
    }));

  const appointmentEvents: ActivityItem[] = snapshot.dataset.appointments
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )
    .slice(0, 4)
    .map((appointment) => ({
      id: `appointment-${appointment.id}`,
      title: appointment.customer.name || "Agendamento sem cliente",
      description: `${appointment.schedule.serviceType || "Serviço"} • ${
        APPOINTMENT_STATUS_LABEL[appointment.status]
      }`,
      at: appointment.updatedAt,
      tone:
        appointment.status === "confirmed"
          ? "success"
          : appointment.status === "failed"
            ? "error"
            : appointment.status === "canceled"
              ? "default"
              : "warning",
    }));

  const notificationEvents: ActivityItem[] = snapshot.dataset.notifications
    .slice(0, 4)
    .map((item) => ({
      id: `notification-${item.id}`,
      title: item.message,
      description: item.description || "Notificação operacional",
      at: item.createdAt,
      tone: item.type === "error" ? "error" : item.type === "progress" ? "warning" : "success",
    }));

  const backupEvents: ActivityItem[] = snapshot.summary.lastBackupAt
    ? [
        {
          id: "backup-last-run",
          title: "Último backup registrado",
          description: snapshot.summary.autoBackupEnabled
            ? "Rotina automática habilitada"
            : "Rotina automática desabilitada",
          at: snapshot.summary.lastBackupAt,
          tone:
            snapshot.summary.autoBackupEnabled &&
            (snapshot.summary.backupOutdatedDays ?? 99) <= 2
              ? "success"
              : "warning",
        },
      ]
    : [];

  return [
    ...serviceOrderEvents,
    ...appointmentEvents,
    ...notificationEvents,
    ...backupEvents,
  ]
    .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
    .slice(0, 8);
};

const buildRecentOrders = (snapshot: DashboardOperationsSnapshot | null): RecentOrderItem[] => {
  if (!snapshot) {
    return [];
  }

  return snapshot.dataset.serviceOrders
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 7)
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderInfo.orderNumber || "-",
      customerName: order.orderInfo.customerName || "Cliente não informado",
      vehicle: order.orderInfo.vehicle || order.orderInfo.plate || "Veículo não informado",
      updatedAt: order.updatedAt,
      total: order.totals.grandTotal,
      status: order.status,
    }));
};

const getHealthMeta = (snapshot: DashboardOperationsSnapshot | null) => {
  if (!snapshot) {
    return {
      label: "Sincronizando dados",
      description: "Coletando a operação em tempo real para montar o painel executivo.",
      color: "default" as const,
    };
  }

  const { summary } = snapshot;
  const riskLoad =
    summary.errorNotifications * 4 +
    summary.missedPendingAppointments * 5 +
    (summary.pendingSignatureServiceOrders + summary.pendingSharedOrders) * 2;

  if (riskLoad >= 18) {
    return {
      label: "Exige atenção imediata",
      description:
        "Há fricção operacional relevante entre assinaturas pendentes, alertas de erro e agenda atrasada.",
      color: "warning" as const,
    };
  }

  return {
    label: "Operação em bom ritmo",
    description:
      "A oficina mantém fluxo saudável entre receita, atendimento, confirmações e carteira ativa.",
    color: "success" as const,
  };
};

const getBackupScore = (snapshot: DashboardOperationsSnapshot | null) => {
  if (!snapshot) {
    return 0;
  }

  const { summary } = snapshot;
  if (!summary.autoBackupEnabled) {
    return 12;
  }

  if (summary.backupOutdatedDays === null) {
    return 48;
  }

  return clamp(100 - summary.backupOutdatedDays * 18);
};

const getToneColor = (
  theme: Theme,
  tone: MetricCardTone,
) => {
  if (tone === "success") {
    return theme.palette.success.main;
  }

  if (tone === "warning") {
    return theme.palette.warning.main;
  }

  if (tone === "danger") {
    return theme.palette.error.main;
  }

  if (tone === "neutral") {
    return alpha(theme.palette.text.primary, 0.66);
  }

  return theme.palette.primary.main;
};

const formatTrendLabel = (
  trend: number,
  mode: MetricCardProps["trendMode"],
) => {
  if (trend === 0) {
    return "Sem variação";
  }

  const prefix = trend > 0 ? "+" : "-";
  const absoluteValue =
    mode === "currency" ? formatCurrency(Math.abs(trend)) : `${Math.abs(trend)}`;

  return `${prefix}${absoluteValue} vs período anterior`;
};

const PremiumPanel = ({
  eyebrow,
  title,
  subtitle,
  action,
  accent,
  children,
  sx,
  contentSx,
}: PremiumPanelProps) => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        position: "relative",
        height: "100%",
        overflow: "hidden",
        borderRadius: 4,
        border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
        background:
          theme.palette.mode === "dark"
            ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(
                theme.palette.common.black,
                0.22,
              )} 100%)`
            : `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.97)} 0%, ${alpha(
                theme.palette.background.default,
                0.94,
              )} 100%)`,
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 26px 44px rgba(0, 0, 0, 0.24)"
            : "0 22px 40px rgba(53, 40, 18, 0.08)",
        ...sx,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            accent ??
            `radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.16)}, transparent 38%)`,
        }}
      />

      <Stack sx={{ position: "relative", height: "100%" }}>
        <Box sx={{ px: { xs: 2.25, md: 2.75 }, pt: { xs: 2.25, md: 2.75 }, pb: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "flex-start" }}
          >
            <Box sx={{ minWidth: 0 }}>
              {eyebrow ? (
                <Typography
                  variant="overline"
                  sx={{
                    color: "text.secondary",
                    letterSpacing: "0.12em",
                  }}
                >
                  {eyebrow}
                </Typography>
              ) : null}

              <Typography
                variant="h5"
                sx={{
                  fontSize: { xs: "1.08rem", md: "1.2rem" },
                  lineHeight: 1.1,
                }}
              >
                {title}
              </Typography>

              {subtitle ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.75,
                    maxWidth: 720,
                  }}
                >
                  {subtitle}
                </Typography>
              ) : null}
            </Box>

            {action ? <Box sx={{ width: { xs: "100%", md: "auto" } }}>{action}</Box> : null}
          </Stack>
        </Box>

        <Divider />

        <Box
          sx={{
            px: { xs: 2.25, md: 2.75 },
            py: { xs: 2.25, md: 2.5 },
            flex: 1,
            minHeight: 0,
            ...contentSx,
          }}
        >
          {children}
        </Box>
      </Stack>
    </Paper>
  );
};

const ExecutiveMetricCard = ({
  label,
  value,
  caption,
  trend,
  trendMode,
  accent,
  icon,
  data,
}: MetricCardProps) => {
  const theme = useTheme();
  const accentColor = getToneColor(theme, accent);
  const chartData = data.some((point) => point !== 0) ? data : [0, 0, 0, 0];

  return (
    <Paper
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "100%",
        borderRadius: 3.5,
        border: `1px solid ${alpha(accentColor, 0.14)}`,
        background:
          theme.palette.mode === "dark"
            ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(
                accentColor,
                0.08,
              )} 100%)`
            : `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(
                accentColor,
                0.07,
              )} 100%)`,
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 18px 36px rgba(0, 0, 0, 0.18)"
            : "0 18px 34px rgba(59, 44, 15, 0.06)",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at top right, ${alpha(accentColor, 0.14)}, transparent 42%)`,
          pointerEvents: "none",
        }}
      />

      <Stack sx={{ position: "relative", p: 2.25, height: "100%" }} spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                letterSpacing: "0.1em",
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                mt: 0.35,
                fontSize: { xs: "1.6rem", md: "1.85rem" },
                lineHeight: 1,
              }}
            >
              {value}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              color: accentColor,
              backgroundColor: alpha(accentColor, 0.12),
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>

        <Chip
          label={formatTrendLabel(trend, trendMode)}
          size="small"
          variant="outlined"
          sx={{
            width: "fit-content",
            borderColor: alpha(accentColor, 0.32),
            color: accentColor,
            backgroundColor: alpha(accentColor, 0.08),
            ".MuiChip-label": {
              px: 1.15,
            },
          }}
        />

        <Typography variant="body2" color="text.secondary">
          {caption}
        </Typography>

        <Box sx={{ mt: "auto" }}>
          <SparkLineChart
            data={chartData}
            area
            color={accentColor}
            curve="monotoneX"
            height={68}
            showHighlight
            sx={{
              width: "100%",
              [`& .${gaugeClasses.valueText}`]: {
                fill: accentColor,
              },
            }}
          />
        </Box>
      </Stack>
    </Paper>
  );
};

const DashboardPanelSkeleton = () => (
  <Stack spacing={1.2}>
    <Skeleton variant="rounded" height={18} width="38%" />
    <Skeleton variant="rounded" height={18} width="55%" />
    <Skeleton variant="rounded" height={240} />
  </Stack>
);

const DashboardInlineLegend = ({
  items,
}: {
  items: Array<{ label: string; value: string; color: string }>;
}) => (
  <Stack spacing={1.15}>
    {items.map((item) => (
      <Stack key={item.label} direction="row" justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" color="text.secondary" noWrap>
            {item.label}
          </Typography>
        </Stack>
        <Typography variant="body2" fontWeight={700}>
          {item.value}
        </Typography>
      </Stack>
    ))}
  </Stack>
);

export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const t = useTranslate();
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilter>("lastWeek");
  const [snapshot, setSnapshot] = useState<DashboardOperationsSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const refreshSnapshot = useCallback(async () => {
    setLoadingSnapshot(true);
    setSnapshotError(null);

    try {
      const nextSnapshot = await getDashboardOperationsSnapshot();
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    } catch (error) {
      if (error instanceof Error) {
        setSnapshotError(error.message);
      } else {
        setSnapshotError("Não foi possível carregar a visão executiva da operação.");
      }

      return null;
    } finally {
      setLoadingSnapshot(false);
    }
  }, []);

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  const summary = snapshot?.summary ?? null;
  const isInitialLoading = loadingSnapshot && !summary;

  const timeBuckets = useMemo(
    () => buildTimeBuckets(snapshot, selectedDateFilter),
    [selectedDateFilter, snapshot],
  );

  const chartLabels = useMemo(
    () => timeBuckets.map((bucket) => bucket.label),
    [timeBuckets],
  );

  const revenuePoints = useMemo<NumericPoint[]>(
    () =>
      snapshot?.dataset.serviceOrders.map((order) => ({
        date: order.updatedAt,
        value: Math.max(0, order.totals.grandTotal),
      })) ?? [],
    [snapshot],
  );

  const orderPoints = useMemo<NumericPoint[]>(
    () =>
      snapshot?.dataset.serviceOrders.map((order) => ({
        date: order.updatedAt,
        value: 1,
      })) ?? [],
    [snapshot],
  );

  const customerPoints = useMemo<NumericPoint[]>(
    () =>
      snapshot?.dataset.customers.map((customer) => ({
        date: customer.createdAt,
        value: 1,
      })) ?? [],
    [snapshot],
  );

  const appointmentPoints = useMemo<NumericPoint[]>(
    () =>
      snapshot?.dataset.appointments.map((appointment) => ({
        date: appointment.schedule.startAt,
        value: 1,
      })) ?? [],
    [snapshot],
  );

  const pendingSignaturePoints = useMemo<NumericPoint[]>(
    () =>
      snapshot
        ? [
            ...snapshot.dataset.serviceOrders
              .filter(
                (order) =>
                  order.status !== "signed" &&
                  (order.status === "sent_for_signature" || order.signature),
              )
              .map((order) => ({
                date: order.updatedAt,
                value: 1,
              })),
            ...snapshot.dataset.sharedOrders
              .filter((order) => order.status !== "signed")
              .map((order) => ({
                date: order.createdAt,
                value: 1,
              })),
          ]
        : [],
    [snapshot],
  );

  const notificationErrorPoints = useMemo<NumericPoint[]>(
    () =>
      snapshot?.dataset.notifications
        .filter((item) => item.type === "error")
        .map((item) => ({
          date: item.createdAt,
          value: 1,
        })) ?? [],
    [snapshot],
  );

  const revenueMetric = useMemo(
    () => buildMetricSummary(selectedDateFilter, revenuePoints, timeBuckets, "revenue"),
    [revenuePoints, selectedDateFilter, timeBuckets],
  );
  const ordersMetric = useMemo(
    () => buildMetricSummary(selectedDateFilter, orderPoints, timeBuckets, "orders"),
    [orderPoints, selectedDateFilter, timeBuckets],
  );
  const customersMetric = useMemo(
    () => buildMetricSummary(selectedDateFilter, customerPoints, timeBuckets, "customers"),
    [customerPoints, selectedDateFilter, timeBuckets],
  );
  const appointmentsMetric = useMemo(
    () =>
      buildMetricSummary(selectedDateFilter, appointmentPoints, timeBuckets, "appointments"),
    [appointmentPoints, selectedDateFilter, timeBuckets],
  );
  const signatureMetric = useMemo(
    () =>
      buildMetricSummary(
        selectedDateFilter,
        pendingSignaturePoints,
        timeBuckets,
        "pendingSignatures",
      ),
    [pendingSignaturePoints, selectedDateFilter, timeBuckets],
  );
  const errorMetric = useMemo(
    () =>
      buildMetricSummary(
        selectedDateFilter,
        notificationErrorPoints,
        timeBuckets,
        "errorNotifications",
      ),
    [notificationErrorPoints, selectedDateFilter, timeBuckets],
  );

  const serviceOrderStatusData = useMemo(
    () =>
      summary
        ? [
            {
              id: "signed",
              label: "Assinadas",
              value: summary.signedServiceOrders,
              color: theme.palette.success.main,
            },
            {
              id: "signature",
              label: "Aguardando assinatura",
              value: summary.sentForSignatureServiceOrders,
              color: theme.palette.warning.main,
            },
            {
              id: "registered",
              label: "Registradas",
              value: summary.registeredServiceOrders,
              color: alpha(theme.palette.text.primary, 0.48),
            },
          ]
        : [],
    [summary, theme.palette.error.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.text.primary],
  );

  const appointmentStatusData = useMemo(
    () =>
      summary
        ? [
            {
              id: "confirmed",
              label: "Confirmados",
              value: summary.confirmedAppointments,
              color: theme.palette.success.main,
            },
            {
              id: "pending",
              label: "Pendentes",
              value: summary.pendingAppointments,
              color: theme.palette.warning.main,
            },
            {
              id: "failed",
              label: "Com falha",
              value: summary.failedAppointments,
              color: theme.palette.error.main,
            },
            {
              id: "canceled",
              label: "Cancelados",
              value: summary.canceledAppointments,
              color: alpha(theme.palette.text.primary, 0.4),
            },
          ]
        : [],
    [summary, theme.palette.error.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.text.primary],
  );

  const topScheduledServices = summary?.topScheduledServices.slice(0, 5) ?? [];
  const topRefusedParts = summary?.topRefusedParts.slice(0, 4) ?? [];
  const topRefusedServices = summary?.topRefusedServices.slice(0, 4) ?? [];
  const recentOrders = useMemo(() => buildRecentOrders(snapshot), [snapshot]);
  const activityItems = useMemo(() => buildActivityItems(snapshot), [snapshot]);
  const healthMeta = useMemo(() => getHealthMeta(snapshot), [snapshot]);

  const signatureCompletionRate = summary
    ? toPercentage(
        summary.signedServiceOrders + summary.signedSharedOrders,
        summary.totalServiceOrders + summary.totalSharedOrders,
      )
    : 0;

  const customerActivationRate = summary
    ? toPercentage(summary.activeCustomers, summary.totalCustomers)
    : 0;

  const backupScore = getBackupScore(snapshot);

  const metricCards = useMemo<MetricCardProps[]>(
    () => [
      {
        label: "Receita no período",
        value: formatCurrency(revenueMetric.total),
        caption: summary
          ? `Ticket médio consolidado: ${formatCurrency(summary.averageServiceOrderTicket)}`
          : "Monitorando o faturamento aprovado da oficina.",
        trend: revenueMetric.trend,
        trendMode: "currency",
        accent: "gold",
        icon: <AccountBalanceWalletOutlinedIcon fontSize="small" />,
        data: revenueMetric.points,
      },
      {
        label: "Ordens de serviço",
        value: `${ordersMetric.total}`,
        caption: summary
          ? `${summary.signedServiceOrders} assinadas e ${summary.registeredServiceOrders} em registro`
          : "Acompanhando entrada e evolução das OS.",
        trend: ordersMetric.trend,
        trendMode: "count",
        accent: "neutral",
        icon: <FactCheckOutlinedIcon fontSize="small" />,
        data: ordersMetric.points,
      },
      {
        label: "Novos clientes",
        value: `${customersMetric.total}`,
        caption: summary
          ? `${formatCompactNumber(summary.activeCustomers)} ativos em carteira`
          : "Medindo crescimento real da base ativa.",
        trend: customersMetric.trend,
        trendMode: "count",
        accent: "success",
        icon: <GroupsOutlinedIcon fontSize="small" />,
        data: customersMetric.points,
      },
      {
        label: "Agendamentos",
        value: `${appointmentsMetric.total}`,
        caption: summary
          ? `${summary.upcomingAppointmentsNext7Days} previstos para os próximos 7 dias`
          : "Monitorando ritmo de agenda e capacidade.",
        trend: appointmentsMetric.trend,
        trendMode: "count",
        accent: "gold",
        icon: <EventNoteOutlinedIcon fontSize="small" />,
        data: appointmentsMetric.points,
      },
      {
        label: "Assinaturas pendentes",
        value: `${(summary?.pendingSignatureServiceOrders ?? 0) + (summary?.pendingSharedOrders ?? 0)}`,
        caption: "Fila que impacta aprovação, caixa e previsibilidade comercial.",
        trend: signatureMetric.trend,
        trendMode: "count",
        accent: "warning",
        icon: <DrawOutlinedIcon fontSize="small" />,
        data: signatureMetric.points,
      },
      {
        label: "Alertas de erro",
        value: `${summary?.errorNotifications ?? 0}`,
        caption: "Ruídos operacionais que merecem resposta antes de virarem gargalo.",
        trend: errorMetric.trend,
        trendMode: "count",
        accent: "danger",
        icon: <ErrorOutlineOutlinedIcon fontSize="small" />,
        data: errorMetric.points,
      },
    ],
    [
      appointmentsMetric.points,
      appointmentsMetric.total,
      appointmentsMetric.trend,
      customersMetric.points,
      customersMetric.total,
      customersMetric.trend,
      errorMetric.points,
      errorMetric.trend,
      ordersMetric.points,
      ordersMetric.total,
      ordersMetric.trend,
      revenueMetric.points,
      revenueMetric.total,
      revenueMetric.trend,
      signatureMetric.points,
      signatureMetric.trend,
      summary,
    ],
  );

  const chartSx = useMemo<SxProps<Theme>>(
    () => ({
      width: "100%",
      "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": {
        stroke: alpha(theme.palette.text.primary, 0.14),
      },
      "& .MuiChartsAxis-tickLabel": {
        fill: theme.palette.text.secondary,
        fontSize: 11,
        fontFamily: theme.typography.fontFamily,
      },
      "& .MuiChartsAxis-label": {
        fill: theme.palette.text.secondary,
        fontSize: 12,
        fontFamily: theme.typography.fontFamily,
      },
      "& .MuiChartsLegend-label": {
        fill: `${theme.palette.text.secondary} !important`,
        fontFamily: `${theme.typography.fontFamily} !important`,
      },
      "& .MuiChartsTooltip-paper": {
        borderRadius: 12,
        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.96),
        backdropFilter: "blur(12px)",
      },
    }),
    [theme],
  );

  return (
    <RefineListView
      title={t("dashboard.title", "Dashboard")}
      headerButtons={() => (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={selectedDateFilter}
            onChange={(_, nextFilter: DateFilter | null) => {
              if (nextFilter) {
                setSelectedDateFilter(nextFilter);
              }
            }}
            sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.9),
              borderRadius: 999,
              p: 0.35,
              ".MuiToggleButton-root": {
                border: 0,
                borderRadius: 999,
                px: 1.5,
              },
            }}
          >
            {Object.values(DATE_FILTERS).map((filter) => (
              <ToggleButton key={filter.value} value={filter.value}>
                {t(filter.labelKey, filter.label)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            disabled={loadingSnapshot}
            onClick={() => void refreshSnapshot()}
          >
            Atualizar painel
          </Button>
        </Stack>
      )}
    >
      <Grid
        container
        columns={24}
        spacing={2.25}
        sx={{
          "@keyframes dashboardEntrance": {
            from: {
              opacity: 0,
              transform: "translateY(10px)",
            },
            to: {
              opacity: 1,
              transform: "translateY(0)",
            },
          },
          "& > *": {
            animation: "dashboardEntrance 380ms ease both",
          },
        }}
      >
        {snapshotError ? (
          <Grid size={24}>
            <Alert severity="warning">{snapshotError}</Alert>
          </Grid>
        ) : null}

        <Grid size={24}>
          <PremiumPanel
            eyebrow="Executive Dashboard"
            title="Centro de comando da operação"
            subtitle={healthMeta.description}
            accent={`radial-gradient(circle at top right, ${alpha(theme.palette.primary.main, 0.2)}, transparent 36%), radial-gradient(circle at bottom left, ${alpha(theme.palette.success.main, 0.16)}, transparent 34%)`}
            action={
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  color={healthMeta.color}
                  label={healthMeta.label}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Atualizado: ${formatDateTime(
                    summary?.lastOperationalUpdateAt ?? snapshot?.generatedAt ?? null,
                  )}`}
                />
              </Stack>
            }
          >
            {isInitialLoading ? (
              <Stack spacing={2}>
                <Skeleton variant="rounded" height={28} width="38%" />
                <Skeleton variant="rounded" height={18} width="62%" />
                <Skeleton variant="rounded" height={180} />
              </Stack>
            ) : (
              <Grid container columns={24} spacing={2.25}>
                <Grid size={{ xs: 24, lg: 14 }}>
                  <Stack spacing={2}>
                    <Typography
                      variant="h3"
                      sx={{
                        maxWidth: 760,
                        fontSize: {
                          xs: "1.7rem",
                          md: "2.35rem",
                        },
                        lineHeight: 1,
                      }}
                    >
                      Receita, agenda, assinaturas e risco operacional em uma única leitura.
                    </Typography>

                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
                      Uma visão executiva desenhada para tomada de decisão rápida: evolução
                      financeira, volume de atendimento, qualidade da carteira, pendências de
                      assinatura e sinais que podem travar a operação.
                    </Typography>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <Chip
                        icon={<BusinessCenterOutlinedIcon />}
                        label={`${summary?.totalServiceOrders ?? 0} OS consolidadas`}
                        variant="outlined"
                      />
                      <Chip
                        icon={<GroupsOutlinedIcon />}
                        label={`${summary?.activeCustomers ?? 0} clientes ativos`}
                        variant="outlined"
                      />
                      <Chip
                        icon={<EventNoteOutlinedIcon />}
                        label={`${summary?.upcomingAppointmentsNext7Days ?? 0} agendamentos em 7 dias`}
                        variant="outlined"
                      />
                    </Stack>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 24, lg: 10 }}>
                  <Grid container columns={10} spacing={1.5}>
                    <Grid size={{ xs: 10, sm: 5 }}>
                      <Paper
                        sx={{
                          height: "100%",
                          p: 1.5,
                          borderRadius: 3,
                          backgroundColor: alpha(theme.palette.background.paper, 0.78),
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Conversão de assinatura
                        </Typography>
                        <Gauge
                          value={signatureCompletionRate}
                          valueMin={0}
                          valueMax={100}
                          startAngle={-110}
                          endAngle={110}
                          innerRadius="78%"
                          outerRadius="100%"
                          text={({ value }) => `${Math.round(value ?? 0)}%`}
                          sx={{
                            width: "100%",
                            height: 156,
                            [`& .${gaugeClasses.valueArc}`]: {
                              fill: theme.palette.primary.main,
                            },
                            [`& .${gaugeClasses.referenceArc}`]: {
                              fill: alpha(theme.palette.text.primary, 0.1),
                            },
                            [`& .${gaugeClasses.valueText}`]: {
                              fill: theme.palette.text.primary,
                              fontFamily: theme.typography.h4.fontFamily,
                              fontSize: 22,
                              fontWeight: 700,
                            },
                          }}
                        />
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 10, sm: 5 }}>
                      <Paper
                        sx={{
                          height: "100%",
                          p: 1.5,
                          borderRadius: 3,
                          backgroundColor: alpha(theme.palette.background.paper, 0.78),
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Saúde do backup
                        </Typography>
                        <Gauge
                          value={backupScore}
                          valueMin={0}
                          valueMax={100}
                          startAngle={-110}
                          endAngle={110}
                          innerRadius="78%"
                          outerRadius="100%"
                          text={({ value }) => `${Math.round(value ?? 0)}%`}
                          sx={{
                            width: "100%",
                            height: 156,
                            [`& .${gaugeClasses.valueArc}`]: {
                              fill:
                                backupScore >= 75
                                  ? theme.palette.success.main
                                  : backupScore >= 45
                                    ? theme.palette.warning.main
                                    : theme.palette.error.main,
                            },
                            [`& .${gaugeClasses.referenceArc}`]: {
                              fill: alpha(theme.palette.text.primary, 0.1),
                            },
                            [`& .${gaugeClasses.valueText}`]: {
                              fill: theme.palette.text.primary,
                              fontFamily: theme.typography.h4.fontFamily,
                              fontSize: 22,
                              fontWeight: 700,
                            },
                          }}
                        />
                      </Paper>
                    </Grid>

                    <Grid size={10}>
                      <Paper
                        sx={{
                          p: 1.5,
                          borderRadius: 3,
                          backgroundColor: alpha(theme.palette.background.paper, 0.78),
                        }}
                      >
                        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                          <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
                            <Typography variant="body2" color="text.secondary">
                              Indicadores imediatos
                            </Typography>
                            <Stack spacing={1.1} sx={{ mt: 1.2 }}>
                              <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Typography variant="body2" color="text.secondary">
                                  Ticket médio
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {formatCurrency(summary?.averageServiceOrderTicket ?? 0)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Typography variant="body2" color="text.secondary">
                                  Pendências de assinatura
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {(summary?.pendingSignatureServiceOrders ?? 0) +
                                    (summary?.pendingSharedOrders ?? 0)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Typography variant="body2" color="text.secondary">
                                  Alertas de erro
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {summary?.errorNotifications ?? 0}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Box>

                          <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
                            <Typography variant="body2" color="text.secondary">
                              Confiança da carteira
                            </Typography>
                            <Typography variant="h4" sx={{ mt: 1 }}>
                              {Math.round(customerActivationRate)}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              da base está ativa e recorrente na operação.
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={customerActivationRate}
                              sx={{
                                mt: 1.75,
                                height: 9,
                                borderRadius: 999,
                                backgroundColor: alpha(theme.palette.success.main, 0.12),
                                "& .MuiLinearProgress-bar": {
                                  borderRadius: 999,
                                  backgroundColor: theme.palette.success.main,
                                },
                              }}
                            />
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </PremiumPanel>
        </Grid>

        {metricCards.map((card) => (
          <Grid key={card.label} size={{ xs: 24, sm: 12, lg: 8, xl: 4 }}>
            {isInitialLoading ? (
              <Skeleton variant="rounded" height={242} />
            ) : (
              <ExecutiveMetricCard {...card} />
            )}
          </Grid>
        ))}

        <Grid size={{ xs: 24, xl: 15 }} sx={{ minHeight: 420 }}>
          <PremiumPanel
            eyebrow="Financial Flow"
            title="Ritmo de faturamento"
            subtitle="Evolução do valor aprovado no período selecionado, destacando a consistência do caixa operacional."
            action={
              <Stack alignItems={{ xs: "flex-start", md: "flex-end" }}>
                <Typography variant="body2" color="text.secondary">
                  Receita acumulada
                </Typography>
                <Typography variant="h5">{formatCurrency(revenueMetric.total)}</Typography>
              </Stack>
            }
          >
            {isInitialLoading ? (
              <DashboardPanelSkeleton />
            ) : (
              <LineChart
                xAxis={[
                  {
                    scaleType: "point",
                    data: chartLabels,
                    tickLabelMinGap: 12,
                  },
                ]}
                yAxis={[
                  {
                    position: "right",
                    valueFormatter: (value: number | null) =>
                      formatCompactNumber(Number(value ?? 0)),
                  },
                ]}
                series={[
                  {
                    id: "revenue",
                    label: "Faturamento aprovado",
                    data: timeBuckets.map((bucket) => bucket.revenue),
                    valueFormatter: (value) => formatCurrency(Number(value ?? 0)),
                    color: theme.palette.primary.main,
                    area: true,
                    showMark: false,
                    curve: "monotoneX",
                  },
                ]}
                height={310}
                margin={{ top: 20, right: 26, left: 8, bottom: 20 }}
                grid={{ horizontal: true }}
                hideLegend
                sx={chartSx}
              />
            )}
          </PremiumPanel>
        </Grid>

        <Grid size={{ xs: 24, xl: 9 }} sx={{ minHeight: 420 }}>
          <PremiumPanel
            eyebrow="Pulse"
            title="Saúde operacional"
            subtitle="Distribuição de status e leitura rápida do atrito na esteira."
          >
            {isInitialLoading ? (
              <DashboardPanelSkeleton />
            ) : (
              <Grid container columns={12} spacing={1.5} sx={{ height: "100%" }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    sx={{
                      height: "100%",
                      p: 1.5,
                      borderRadius: 3,
                      backgroundColor: alpha(theme.palette.background.paper, 0.76),
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Status das ordens
                    </Typography>
                    <PieChart
                      height={220}
                      series={[
                        {
                          data: serviceOrderStatusData,
                          innerRadius: 58,
                          outerRadius: 88,
                          paddingAngle: 3,
                          cornerRadius: 6,
                        },
                      ]}
                      hideLegend
                      sx={chartSx}
                    />
                    <DashboardInlineLegend
                      items={serviceOrderStatusData.map((item) => ({
                        label: item.label,
                        value: `${item.value}`,
                        color: item.color,
                      }))}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    sx={{
                      height: "100%",
                      p: 1.5,
                      borderRadius: 3,
                      backgroundColor: alpha(theme.palette.background.paper, 0.76),
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Status da agenda
                    </Typography>
                    <PieChart
                      height={220}
                      series={[
                        {
                          data: appointmentStatusData,
                          innerRadius: 58,
                          outerRadius: 88,
                          paddingAngle: 3,
                          cornerRadius: 6,
                        },
                      ]}
                      hideLegend
                      sx={chartSx}
                    />
                    <DashboardInlineLegend
                      items={appointmentStatusData.map((item) => ({
                        label: item.label,
                        value: `${item.value}`,
                        color: item.color,
                      }))}
                    />
                  </Paper>
                </Grid>
              </Grid>
            )}
          </PremiumPanel>
        </Grid>

        <Grid size={{ xs: 24, xl: 12 }} sx={{ minHeight: 420 }}>
          <PremiumPanel
            eyebrow="Demand"
            title="Volume e aquisição por dia"
            subtitle="Leitura combinada de ordens de serviço abertas e entrada de novos clientes."
          >
            {isInitialLoading ? (
              <DashboardPanelSkeleton />
            ) : (
              <LineChart
                xAxis={[
                  {
                    scaleType: "point",
                    data: chartLabels,
                    tickLabelMinGap: 12,
                  },
                ]}
                series={[
                  {
                    id: "orders",
                    label: "Ordens",
                    data: timeBuckets.map((bucket) => bucket.orders),
                    valueFormatter: (value) => `${value ?? 0} ordens`,
                    color: theme.palette.primary.main,
                    area: true,
                    showMark: false,
                    curve: "monotoneX",
                  },
                  {
                    id: "customers",
                    label: "Novos clientes",
                    data: timeBuckets.map((bucket) => bucket.customers),
                    valueFormatter: (value) => `${value ?? 0} clientes`,
                    color: theme.palette.success.main,
                    showMark: false,
                    curve: "monotoneX",
                  },
                ]}
                height={310}
                margin={{ top: 20, right: 12, left: 8, bottom: 20 }}
                grid={{ horizontal: true }}
                sx={chartSx}
              />
            )}
          </PremiumPanel>
        </Grid>

        <Grid size={{ xs: 24, xl: 12 }} sx={{ minHeight: 420 }}>
          <PremiumPanel
            eyebrow="Mix"
            title="Serviços mais agendados"
            subtitle="Ranking do que mais puxa a agenda, ajudando a orientar capacidade, peças e comunicação comercial."
          >
            {isInitialLoading ? (
              <DashboardPanelSkeleton />
            ) : (
              <BarChart
                layout="horizontal"
                yAxis={[
                  {
                    scaleType: "band",
                    data: topScheduledServices.map((item) => item.label),
                    width: 140,
                  },
                ]}
                xAxis={[
                  {
                    valueFormatter: (value: number | null) => `${value ?? 0}`,
                  },
                ]}
                series={[
                  {
                    id: "scheduled-services",
                    label: "Agendamentos",
                    data: topScheduledServices.map((item) => item.count),
                    color: theme.palette.primary.main,
                    valueFormatter: (value) => `${value ?? 0} agendamentos`,
                    barLabel: "value",
                    barLabelPlacement: "outside",
                  },
                ]}
                height={310}
                margin={{ top: 10, right: 42, left: 0, bottom: 10 }}
                grid={{ vertical: true }}
                hideLegend
                sx={chartSx}
              />
            )}
          </PremiumPanel>
        </Grid>

        <Grid size={{ xs: 24, xl: 14 }} sx={{ minHeight: 560 }}>
          <PremiumPanel
            eyebrow="Intelligence"
            title="Leitura executiva com IA"
            subtitle="Resumo narrativo, riscos por frente e plano de ação com base no retrato atual da oficina."
          >
            <OperationsInsightPanel
              snapshot={snapshot}
              loadingSnapshot={loadingSnapshot}
              onRefreshSnapshot={refreshSnapshot}
            />
          </PremiumPanel>
        </Grid>

        <Grid size={{ xs: 24, xl: 10 }} sx={{ minHeight: 560 }}>
          <PremiumPanel
            eyebrow="Latest Service Orders"
            title="Ordens mais recentes"
            subtitle="Últimos movimentos comerciais e operacionais com foco em valor, cliente e estágio."
          >
            {isInitialLoading ? (
              <Stack spacing={1.2}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} variant="rounded" height={64} />
                ))}
              </Stack>
            ) : (
              <Stack spacing={1.1}>
                {recentOrders.map((order) => {
                  const statusColor =
                    order.status === "signed"
                      ? theme.palette.success.main
                      : order.status === "sent_for_signature"
                        ? theme.palette.warning.main
                        : alpha(theme.palette.text.primary, 0.58);

                  return (
                    <Paper
                      key={order.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        backgroundColor: alpha(theme.palette.background.paper, 0.74),
                        border: `1px solid ${alpha(statusColor, 0.18)}`,
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                            <Typography variant="subtitle2">{`OS ${order.orderNumber}`}</Typography>
                            <Chip
                              size="small"
                              label={ORDER_STATUS_LABEL[order.status]}
                              variant="outlined"
                              sx={{
                                color: statusColor,
                                borderColor: alpha(statusColor, 0.35),
                                backgroundColor: alpha(statusColor, 0.08),
                              }}
                            />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                            {order.customerName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {order.vehicle} • Atualizada em {formatDateTime(order.updatedAt)}
                          </Typography>
                        </Box>

                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            alignSelf: { xs: "flex-start", sm: "center" },
                          }}
                        >
                          {formatCurrency(order.total)}
                        </Typography>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </PremiumPanel>
        </Grid>

        <Grid size={{ xs: 24, xl: 12 }} sx={{ minHeight: 460 }}>
          <PremiumPanel
            eyebrow="Signals"
            title="Riscos e oportunidades"
            subtitle="Os itens que mais merecem ação: recusas com impacto financeiro, backlog e disciplina operacional."
          >
            {isInitialLoading ? (
              <Stack spacing={1.5}>
                <Skeleton variant="rounded" height={72} />
                <Skeleton variant="rounded" height={72} />
                <Skeleton variant="rounded" height={220} />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Grid container columns={12} spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        backgroundColor: alpha(theme.palette.background.paper, 0.76),
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Atrasos de agenda
                      </Typography>
                      <Typography variant="h4" sx={{ mt: 0.75 }}>
                        {summary?.missedPendingAppointments ?? 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        pendências já vencidas esperando reação do time.
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        backgroundColor: alpha(theme.palette.background.paper, 0.76),
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Valor recusado
                      </Typography>
                      <Typography variant="h4" sx={{ mt: 0.75 }}>
                        {formatCurrency(summary?.totalRefusedValue ?? 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        concentrado em peças e serviços que travam conversão.
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        backgroundColor: alpha(theme.palette.background.paper, 0.76),
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Backup
                      </Typography>
                      <Typography variant="h4" sx={{ mt: 0.75 }}>
                        {summary?.autoBackupEnabled ? "Ativo" : "Inativo"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Último registro em {formatDateTime(summary?.lastBackupAt ?? null)}.
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Grid container columns={12} spacing={1.5}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        backgroundColor: alpha(theme.palette.background.paper, 0.76),
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <Inventory2OutlinedIcon fontSize="small" color="warning" />
                        <Typography variant="subtitle2">Peças mais recusadas</Typography>
                      </Stack>

                      <Stack spacing={1.1}>
                        {topRefusedParts.length ? (
                          topRefusedParts.map((item, index) => (
                            <Box key={`${item.label}-${index}`}>
                              <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Typography variant="body2" sx={{ minWidth: 0 }}>
                                  {item.label}
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {formatCurrency(item.totalValue)}
                                </Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {item.count} recusas registradas
                              </Typography>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Nenhuma peça recusada no período consolidado.
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        backgroundColor: alpha(theme.palette.background.paper, 0.76),
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <HandymanOutlinedIcon fontSize="small" color="warning" />
                        <Typography variant="subtitle2">Serviços mais recusados</Typography>
                      </Stack>

                      <Stack spacing={1.1}>
                        {topRefusedServices.length ? (
                          topRefusedServices.map((item, index) => (
                            <Box key={`${item.label}-${index}`}>
                              <Stack direction="row" justifyContent="space-between" spacing={2}>
                                <Typography variant="body2" sx={{ minWidth: 0 }}>
                                  {item.label}
                                </Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {formatCurrency(item.totalValue)}
                                </Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {item.count} recusas registradas
                              </Typography>
                            </Box>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Nenhum serviço recusado no período consolidado.
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Stack>
            )}
          </PremiumPanel>
        </Grid>

        <Grid size={{ xs: 24, xl: 12 }} sx={{ minHeight: 460 }}>
          <PremiumPanel
            eyebrow="Activity Feed"
            title="Pulso da operação"
            subtitle="Linha de eventos recentes que ajuda a sentir ritmo, risco e resposta do time."
          >
            {isInitialLoading ? (
              <Stack spacing={1.25}>
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={index} variant="rounded" height={52} />
                ))}
              </Stack>
            ) : (
              <Stack spacing={1.15}>
                {activityItems.map((item) => {
                  const toneColor =
                    item.tone === "success"
                      ? theme.palette.success.main
                      : item.tone === "warning"
                        ? theme.palette.warning.main
                        : item.tone === "error"
                          ? theme.palette.error.main
                          : alpha(theme.palette.text.primary, 0.6);

                  return (
                    <Paper
                      key={item.id}
                      sx={{
                        p: 1.35,
                        borderRadius: 3,
                        backgroundColor: alpha(theme.palette.background.paper, 0.74),
                        border: `1px solid ${alpha(toneColor, 0.18)}`,
                      }}
                    >
                      <Stack direction="row" spacing={1.2} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            mt: 0.85,
                            borderRadius: 999,
                            backgroundColor: toneColor,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            justifyContent="space-between"
                            spacing={0.75}
                          >
                            <Typography variant="subtitle2">{item.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(item.at)}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                            {item.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </PremiumPanel>
        </Grid>
      </Grid>
    </RefineListView>
  );
};
