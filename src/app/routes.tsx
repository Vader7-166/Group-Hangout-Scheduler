import { createBrowserRouter } from "react-router";
import AdminPage from "./pages/AdminPage";
import EventPage from "./pages/EventPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AdminPage,
  },
  {
    path: "/event/:eventId",
    Component: EventPage,
  },
]);
