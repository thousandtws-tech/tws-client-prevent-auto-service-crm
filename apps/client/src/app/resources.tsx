import { useMemo, type ReactNode } from "react";
import type { IResourceItem } from "@refinedev/core";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import SupervisorAccountOutlinedIcon from "@mui/icons-material/SupervisorAccountOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";

type Translate = (key: string, defaultValue: string) => string;

const OPERATIONS_PARENT = "operations-management";
const SERVICE_ORDER_PARENT = "service-order-management";
const ADMINISTRATION_PARENT = "administration-management";

const DASHBOARD_ICON = <SpaceDashboardOutlinedIcon />;
const SETTINGS_ICON = <SettingsOutlinedIcon />;
const OPERATIONS_PARENT_ICON = <WorkOutlineOutlinedIcon />;
const SERVICE_ORDER_PARENT_ICON = <EngineeringOutlinedIcon />;
const ADMINISTRATION_PARENT_ICON = <AdminPanelSettingsOutlinedIcon />;
const CUSTOMERS_ICON = <SupervisorAccountOutlinedIcon />;
const SCHEDULING_ICON = <EventNoteOutlinedIcon />;
const SERVICE_ORDER_ICON = <NoteAddOutlinedIcon />;
const SERVICE_ORDER_HISTORY_ICON = <InsightsOutlinedIcon />;
const SERVICE_ORDER_SIGNATURES_ICON = <DrawOutlinedIcon />;
const SERVICE_ORDER_REFUSALS_ICON = <RuleOutlinedIcon />;
const SERVICE_ORDER_PARTS_ICON = <Inventory2OutlinedIcon />;
const SERVICE_ORDER_LABOR_ICON = <HandymanOutlinedIcon />;
const SERVICE_ORDER_CHECKLISTS_ICON = <ChecklistOutlinedIcon />;

type ResourceLeafConfig = {
  name: string;
  list: string;
  label: string;
  icon: ReactNode;
  parent?: string;
};

type ResourceGroupConfig = {
  name: string;
  label: string;
  icon: ReactNode;
};

const createLeafResource = (config: ResourceLeafConfig): IResourceItem => {
  const { name, list, label, icon, parent } = config;
  return {
    name,
    list,
    meta: {
      label,
      icon,
      ...(parent ? { parent } : {}),
    },
  };
};

const createGroupResource = (config: ResourceGroupConfig): IResourceItem => {
  const { name, label, icon } = config;
  return {
    name,
    meta: {
      label,
      icon,
    },
  };
};

export const useAppResources = (t: Translate) =>
  useMemo(
    () => [
      createGroupResource({
        name: OPERATIONS_PARENT,
        label: "Operação",
        icon: OPERATIONS_PARENT_ICON,
      }),
      createLeafResource({
        name: "dashboard",
        list: "/",
        label: t("dashboard.title", "Dashboard"),
        parent: OPERATIONS_PARENT,
        icon: DASHBOARD_ICON,
      }),
      createLeafResource({
        name: "customers",
        list: "/clientes",
        label: t("customers.title", "Clientes"),
        parent: OPERATIONS_PARENT,
        icon: CUSTOMERS_ICON,
      }),
      createLeafResource({
        name: "scheduling",
        list: "/agendamentos",
        label: t("scheduling.title", "Agendamentos"),
        parent: OPERATIONS_PARENT,
        icon: SCHEDULING_ICON,
      }),
      createGroupResource({
        name: SERVICE_ORDER_PARENT,
        label: "Gestão de Ordem de Serviço",
        icon: SERVICE_ORDER_PARENT_ICON,
      }),
      createLeafResource({
        name: "service-order",
        list: "/ordem-servico",
        label: "Nova Ordem de Serviço",
        parent: SERVICE_ORDER_PARENT,
        icon: SERVICE_ORDER_ICON,
      }),
      createLeafResource({
        name: "service-order-parts",
        list: "/ordem-servico/pecas",
        label: "Cadastro de Peças",
        parent: SERVICE_ORDER_PARENT,
        icon: SERVICE_ORDER_PARTS_ICON,
      }),
      createLeafResource({
        name: "service-order-labor",
        list: "/ordem-servico/mao-de-obra",
        label: "Cadastro de Mão de Obra",
        parent: SERVICE_ORDER_PARENT,
        icon: SERVICE_ORDER_LABOR_ICON,
      }),
      createLeafResource({
        name: "service-order-checklists",
        list: "/ordem-servico/checklists",
        label: "Checklist Personalizado",
        parent: SERVICE_ORDER_PARENT,
        icon: SERVICE_ORDER_CHECKLISTS_ICON,
      }),
      createLeafResource({
        name: "service-order-history",
        list: "/ordem-servico/historico",
        label: t("serviceOrder.history", "Histórico de Ordens"),
        parent: SERVICE_ORDER_PARENT,
        icon: SERVICE_ORDER_HISTORY_ICON,
      }),
      createLeafResource({
        name: "service-order-signatures",
        list: "/ordem-servico/assinaturas",
        label: "Assinaturas Recebidas",
        parent: SERVICE_ORDER_PARENT,
        icon: SERVICE_ORDER_SIGNATURES_ICON,
      }),
      createLeafResource({
        name: "service-order-refusals",
        list: "/ordem-servico/recusas",
        label: "Serviços Recusados",
        parent: SERVICE_ORDER_PARENT,
        icon: SERVICE_ORDER_REFUSALS_ICON,
      }),
      createGroupResource({
        name: ADMINISTRATION_PARENT,
        label: "Administração",
        icon: ADMINISTRATION_PARENT_ICON,
      }),
      createLeafResource({
        name: "settings",
        list: "/settings",
        label: t("settings.title", "Configurações"),
        parent: ADMINISTRATION_PARENT,
        icon: SETTINGS_ICON,
      }),
    ],
    [t],
  );
