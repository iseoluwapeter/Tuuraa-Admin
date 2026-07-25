
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:mt-0 bg-gray-100 ml-0 md:ml-64 ">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
