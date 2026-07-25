import React, { useState } from "react";
import { RxDashboard } from "react-icons/rx";
import { FiUsers, FiUserCheck } from "react-icons/fi";
import { MdWorkOutline, MdArticle } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi";
import { IoMdClose } from "react-icons/io";
import { HiMenu, HiOutlineLogout } from "react-icons/hi";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { TuuraaLogo } from "../assets";

interface MenuItem {
  id: number;
  icon: React.ReactNode;
  title: string;
  path: string;
  roles: string[];
}

const allMenuItems: MenuItem[] = [
  {
    id: 1,
    icon: <RxDashboard size={20} />,
    title: "Dashboard",
    path: "/dashboard",
    roles: ["admin", "coordinator"],
  },
  {
    id: 2,
    icon: <FiUsers size={20} />,
    title: "Clients",
    path: "/clients",
    roles: ["admin", "coordinator"],
  },
  {
    id: 3,
    icon: <FiUserCheck size={20} />,
    title: "Operators",
    path: "/operators",
    roles: ["admin", "coordinator"],
  },
  {
    id: 4,
    icon: <HiOutlineUserGroup size={20} />,
    title: "Coordinators",
    path: "/coordinators",
    roles: ["admin"],
  },
  {
    id: 5,
    icon: <MdWorkOutline size={20} />,
    title: "Manifests",
    path: "/manifests",
    roles: ["admin", "coordinator"],
  },

  {
    id: 6,
    icon: <MdArticle size={20} />,
    title: "Invoices",
    path: "/invoices",
    roles: ["admin", "coordinator"],
  },
];

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  //
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();

  const visibleMenu = allMenuItems.filter((item) =>
    item.roles.includes(role ?? ""),
  );

  const handleLogout = async () => {
    await signOut();
    setShowModal(false);
    navigate("/");
  };

  // console.log(user);
  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden p-4 bg-[#159143] text-white flex justify-between items-center">
        <img src="/tfbn_logo_white.png" alt="logo" width="150" />
        <button onClick={() => setIsOpen((v) => !v)} aria-label="Toggle menu">
          {isOpen ? <IoMdClose size={24} /> : <HiMenu size={24} />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`bg-[#159143] text-white w-64 p-6 fixed top-0 left-0 h-screen z-40 flex flex-col transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        {/* Logo */}
        <div className="mb-7">
          <img src={TuuraaLogo} alt="logo" className="w-37.5" />
        </div>

        {/* Nav links */}
        <ul className="space-y-2 text-base flex-1">
          {loading ? (
            <li className="text-white/50 text-sm px-2 py-2 animate-pulse">
              Loading…
            </li>
          ) : (
            visibleMenu.map((menu) => (
              <li key={menu.id}>
                <NavLink
                  to={menu.path}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-white text-[#159143] font-semibold shadow-sm"
                        : "hover:bg-white/10"
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  {menu.icon}
                  <span>{menu.title}</span>
                </NavLink>
              </li>
            ))
          )}
        </ul>

        {/* Logout — pinned to bottom */}
        <div className="pt-4 border-t border-white/20">
          {/* Role badge */}
          {role && (
            <div className="mb-5">
              <span className="text-xs font-semibold  tracking-widest bg-white/20 text-white px-3 py-1 rounded-full">
                {user?.email}
              </span>
            </div>
          )}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-all w-full"
          >
            <HiOutlineLogout size={20} />
            <span>Logout</span>
          </motion.button>
        </div>
      </aside>

      {/* Logout modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white p-6 rounded-2xl shadow-2xl w-[90%] max-w-sm"
            >
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Log out?
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                You'll be returned to the login screen.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition text-sm font-medium"
                >
                  Yes, log out
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </>
  );
};

export default Sidebar;
