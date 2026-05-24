// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DriveProvider } from "./contexts/DriveContext";
import HomePage from "./pages/HomePage";
import RepoPage from "./pages/RepoPage";
import PublicViewPage from "./pages/PublicViewPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DriveProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* /repo/:fileId — editable for anyone with a name */}
            <Route path="/repo/:fileId" element={<RepoPage />} />
            {/* /view/:fileId — read-only snapshot view */}
            <Route path="/view/:fileId" element={<PublicViewPage />} />
          </Routes>
        </DriveProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
