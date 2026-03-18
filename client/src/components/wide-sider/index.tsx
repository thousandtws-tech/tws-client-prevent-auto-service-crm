import React, { type CSSProperties, useState } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import ListOutlined from "@mui/icons-material/ListOutlined";
import Logout from "@mui/icons-material/Logout";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import Dashboard from "@mui/icons-material/Dashboard";
import {
  CanAccess,
  type TreeMenuItem,
  useIsExistAuthentication,
  useLogout,
  useTranslate,
  useLink,
  useMenu,
  useActiveAuthProvider,
  useWarnAboutChange,
} from "@refinedev/core";
import {
  ThemedTitle,
  useThemedLayoutContext,
  type RefineThemedLayoutSiderProps,
} from "@refinedev/mui";

const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH = 320;
const HIDDEN_SCROLLBAR_SX = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": {
    width: 0,
    height: 0,
    display: "none",
  },
} as const;

export const WideSider: React.FC<RefineThemedLayoutSiderProps> = ({
  Title: TitleFromProps,
  render,
  meta,
  activeItemDisabled = false,
  siderItemsAreCollapsed = true,
}) => {
  const {
    siderCollapsed,
    setSiderCollapsed,
    mobileSiderOpen,
    setMobileSiderOpen,
  } = useThemedLayoutContext();

  const drawerWidth = () => {
    if (siderCollapsed) return COLLAPSED_WIDTH;
    return EXPANDED_WIDTH;
  };

  const t = useTranslate();
  const Link = useLink();
  const translate = useTranslate();

  const { menuItems, selectedKey, defaultOpenKeys } = useMenu({ meta });
  const isExistAuthentication = useIsExistAuthentication();
  const authProvider = useActiveAuthProvider();
  const { warnWhen, setWarnWhen } = useWarnAboutChange();
  const { mutate: mutateLogout } = useLogout();

  const defaultExpandMenuItems = (() => {
    const defaultOpen: Record<string, boolean> = {};

    if (siderItemsAreCollapsed) return defaultOpen;

    return menuItems.reduce((prev, curr) => {
      const { key } = curr;

      return {
        ...prev,
        [key]: true,
      };
    }, defaultOpen);
  })();

  const [open, setOpen] = useState<Record<string, boolean>>(defaultExpandMenuItems);

  React.useEffect(() => {
    setOpen((previous) => {
      const previousKeys = Object.keys(previous);
      const previousOpenKeys = previousKeys.filter((key) => previous[key]);

      const uniqueKeys = new Set([...previousOpenKeys, ...defaultOpenKeys]);
      return Object.fromEntries(
        Array.from(uniqueKeys.values()).map((key) => [key, true]),
      );
    });
  }, [defaultOpenKeys]);

  const RenderToTitle = TitleFromProps ?? ThemedTitle;

  const handleClick = (key: string) => {
    setOpen((current) => ({ ...current, [key]: !current[key] }));
  };

  const renderTreeView = (tree: TreeMenuItem[], selected?: string) => {
    return tree.map((item) => {
      const { icon, label, route, name, children, meta: itemMeta } = item;
      const isOpen = open[item.key || ""] || false;
      const isSelected = item.key === selected;
      const isNested = !(itemMeta?.parent === undefined);

      if (children.length > 0) {
        return (
          <CanAccess
            key={item.key}
            resource={name}
            action="list"
            params={{ resource: item }}
          >
            <div key={item.key}>
              <Tooltip
                title={label ?? name}
                placement="right"
                disableHoverListener={!siderCollapsed}
                arrow
              >
                <ListItemButton
                  onClick={() => {
                    if (siderCollapsed) {
                      setSiderCollapsed(false);
                      if (!isOpen) {
                        handleClick(item.key || "");
                      }
                    } else {
                      handleClick(item.key || "");
                    }
                  }}
                  sx={{
                    pl: isNested ? 4 : 2,
                    justifyContent: "center",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      justifyContent: "center",
                      minWidth: "24px",
                      transition: "margin-right 0.3s",
                      marginRight: siderCollapsed ? "0px" : "12px",
                      color: "currentColor",
                    }}
                  >
                    {icon ?? <ListOutlined />}
                  </ListItemIcon>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      noWrap: true,
                      fontSize: "14px",
                    }}
                  />
                  {!siderCollapsed &&
                    (isOpen ? (
                      <ExpandLess sx={{ color: "text.icon" }} />
                    ) : (
                      <ExpandMore sx={{ color: "text.icon" }} />
                    ))}
                </ListItemButton>
              </Tooltip>
              {!siderCollapsed && (
                <Collapse in={open[item.key || ""]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {renderTreeView(children, selected)}
                  </List>
                </Collapse>
              )}
            </div>
          </CanAccess>
        );
      }

      const linkStyle: CSSProperties =
        activeItemDisabled && isSelected ? { pointerEvents: "none" } : {};

      return (
        <CanAccess
          key={item.key}
          resource={name}
          action="list"
          params={{ resource: item }}
        >
          <Tooltip
            title={label ?? name}
            placement="right"
            disableHoverListener={!siderCollapsed}
            arrow
          >
            <ListItemButton
              component={Link as any}
              to={route}
              selected={isSelected}
              style={linkStyle}
              onClick={() => {
                setMobileSiderOpen(false);
              }}
              sx={{
                pl: isNested ? 4 : 2,
                py: isNested ? 1.25 : 1,
                justifyContent: "center",
                color: isSelected ? "primary.main" : "text.primary",
              }}
            >
              <ListItemIcon
                sx={{
                  justifyContent: "center",
                  transition: "margin-right 0.3s",
                  marginRight: siderCollapsed ? "0px" : "12px",
                  minWidth: "24px",
                  color: "currentColor",
                }}
              >
                {icon ?? <ListOutlined />}
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  noWrap: true,
                  fontSize: "14px",
                }}
              />
            </ListItemButton>
          </Tooltip>
        </CanAccess>
      );
    });
  };

  const dashboard = (
    <CanAccess resource="dashboard" action="list">
      <Tooltip
        title={translate("dashboard.title", "Dashboard")}
        placement="right"
        disableHoverListener={!siderCollapsed}
        arrow
      >
        <Link
          to="/"
          style={{ textDecoration: "none" }}
          onClick={() => {
            setMobileSiderOpen(false);
          }}
        >
          <ListItemButton
            selected={selectedKey === "/"}
            sx={{
              pl: 2,
              py: 1,
              justifyContent: "center",
              color: selectedKey === "/" ? "primary.main" : "text.primary",
            }}
          >
            <ListItemIcon
              sx={{
                justifyContent: "center",
                minWidth: "24px",
                transition: "margin-right 0.3s",
                marginRight: siderCollapsed ? "0px" : "12px",
                color: "currentColor",
                fontSize: "14px",
              }}
            >
              <Dashboard />
            </ListItemIcon>
            <ListItemText
              primary={translate("dashboard.title", "Dashboard")}
              primaryTypographyProps={{
                noWrap: true,
                fontSize: "14px",
              }}
            />
          </ListItemButton>
        </Link>
      </Tooltip>
    </CanAccess>
  );

  const handleLogout = () => {
    if (warnWhen) {
      const confirm = window.confirm(
        t(
          "warnWhenUnsavedChanges",
          "Are you sure you want to leave? You have unsaved changes.",
        ),
      );

      if (confirm) {
        setWarnWhen(false);
        mutateLogout();
      }
    } else {
      mutateLogout();
    }
  };

  const logout = isExistAuthentication && authProvider ? (
    <Tooltip
      title={t("buttons.logout", "Logout")}
      placement="right"
      disableHoverListener={!siderCollapsed}
      arrow
    >
      <ListItemButton
        key="logout"
        onClick={handleLogout}
        sx={{ justifyContent: "center" }}
      >
        <ListItemIcon
          sx={{
            justifyContent: "center",
            minWidth: "24px",
            transition: "margin-right 0.3s",
            marginRight: siderCollapsed ? "0px" : "12px",
            color: "currentColor",
          }}
        >
          <Logout />
        </ListItemIcon>
        <ListItemText
          primary={t("buttons.logout", "Logout")}
          primaryTypographyProps={{
            noWrap: true,
            fontSize: "14px",
          }}
        />
      </ListItemButton>
    </Tooltip>
  ) : null;

  const items = renderTreeView(menuItems, selectedKey);

  const renderSider = () => {
    if (render) {
      return render({
        logout,
        items,
        collapsed: siderCollapsed,
      });
    }
    return (
      <>
        {dashboard}
        {items}
        {logout}
      </>
    );
  };

  const drawer = (
    <List disablePadding sx={{ flexGrow: 1, paddingTop: "16px" }}>
      {renderSider()}
    </List>
  );

  return (
    <>
      <Box
        sx={{
          width: { xs: drawerWidth() },
          display: { xs: "none", md: "block" },
          transition: "width 0.3s ease",
        }}
      />
      <Box
        component="nav"
        sx={{
          position: "fixed",
          zIndex: 1101,
          width: { sm: drawerWidth() },
          display: "flex",
        }}
      >
        <Drawer
          variant="temporary"
          elevation={2}
          open={mobileSiderOpen}
          onClose={() => setMobileSiderOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { sm: "block", md: "none" } }}
        >
          <Box
            sx={{
              width: drawerWidth(),
              height: "100dvh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                height: 64,
                display: "flex",
                alignItems: "center",
                paddingLeft: "16px",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              <RenderToTitle collapsed={false} />
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                minHeight: 0,
                overflowX: "hidden",
                overflowY: "auto",
                ...HIDDEN_SCROLLBAR_SX,
              }}
            >
              {drawer}
            </Box>
          </Box>
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth(),
              overflow: "hidden",
              transition: "width 200ms cubic-bezier(0.4, 0, 0.6, 1) 0ms",
            },
          }}
          open
        >
          <Paper
            elevation={0}
            sx={{
              fontSize: "14px",
              width: "100%",
              height: 64,
              display: "flex",
              flexShrink: 0,
              alignItems: "center",
              justifyContent: siderCollapsed ? "center" : "space-between",
              paddingLeft: siderCollapsed ? 0 : "16px",
              paddingRight: siderCollapsed ? 0 : "8px",
              variant: "outlined",
              borderRadius: 0,
              borderBottom: (theme) =>
                `1px solid ${theme.palette.action.focus}`,
            }}
          >
            <RenderToTitle collapsed={siderCollapsed} />
            {!siderCollapsed && (
              <IconButton size="small" onClick={() => setSiderCollapsed(true)}>
                <ChevronLeft />
              </IconButton>
            )}
          </Paper>
          <Box
            sx={{
              flexGrow: 1,
              minHeight: 0,
              overflowX: "hidden",
              overflowY: "auto",
              ...HIDDEN_SCROLLBAR_SX,
            }}
          >
            {drawer}
          </Box>
        </Drawer>
      </Box>
    </>
  );
};
