import type { RouteObject } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { CreateRoomPage } from '../features/lobby/CreateRoomPage';
import { JoinRoomPage } from '../features/lobby/JoinRoomPage';
import { LandingPage } from '../features/lobby/LandingPage';
import { NotFoundPage } from '../features/NotFoundPage';
import { RoomPage } from '../features/rooms/RoomPage';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/create', element: <CreateRoomPage /> },
      { path: '/join', element: <JoinRoomPage /> },
      { path: '/room/:roomCode', element: <RoomPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
