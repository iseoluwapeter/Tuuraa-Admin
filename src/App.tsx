import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Client";
import Login from "./pages/Login";
import Operators from "./pages/Operators";
import ProtectedRoute from "./components/ProtectedRoute";
// import Coordinators from "./pages/Coordinators";
import { initAuth } from "./store/authInitializer";
import Jobs from "./pages/Jobs";
import { InvoicePage } from "./pages/InvoicePage";
// import Manifests from "./pages/Manifests";
// import DropLedger from "./pages/DropLedger";

const App = () => {
  useEffect(() => {
    const cleanup = initAuth();
    return cleanup;
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<Layout />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "coordinator"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* <Route
          path="/coordinators"
          element={
            <ProtectedRoute allowedRoles={["admin", "coordinator"]}>
              <Coordinators />
            </ProtectedRoute>
          }
        /> */}

        <Route
          path="/clients"
          element={
            <ProtectedRoute allowedRoles={["admin", "coordinator"]}>
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="/operators"
          element={
            <ProtectedRoute allowedRoles={["admin", "coordinator"]}>
              <Operators />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manifests"
          element={
            <ProtectedRoute allowedRoles={["admin", "coordinator"]}>
              <Jobs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <ProtectedRoute allowedRoles={["admin", "coordinator"]}>
              <InvoicePage />
            </ProtectedRoute>
          }
        />

        {/* <Route
          path="/manifests"
          element={
            <ProtectedRoute allowedRoles={["admin", "coordinator"]}>
              <Manifests />
            </ProtectedRoute>
          }
        /> */}
      </Route>
    </Routes>
  );
};

export default App;
