import { SECTIONS, TEAMS, POINTS } from "../../shared/tasks.mjs";
import { json } from "../_lib.js";

// The board and team names are public; passwords never leave the server.
export const onRequestGet = () =>
  json({ sections: SECTIONS, points: POINTS, teams: TEAMS.map(({ id, name, players }) => ({ id, name, players })) });
