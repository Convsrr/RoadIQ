import type { Metadata } from "next";
import { ProfileView } from "@/components/roadiq/profile-view";

export const metadata: Metadata = { title: "Your profile", description: "Your RoadIQ score, XP, streaks and category performance." };

export default function ProfilePage() { return <ProfileView />; }
