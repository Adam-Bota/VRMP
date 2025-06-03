import { HouseIcon, RadioIcon } from "lucide-react";

export const siteConfig: {
  title: string;
  description: string;
  navItems: {
    title: string;
    url: string;
    icon: React.ReactNode;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
} = {
  title: "Vinema Hub",
  description: "Vinema Hub",
  navItems: [
    {
      title: "Home",
      icon: <HouseIcon />,
      url: "/",
    },
    {
      title: "Sessions",
      icon: <RadioIcon />,
      url: "/sessions",
      items: [
        {
          title: "Create Session",
          url: "/session",
        },
      ]
    },
  ],
};
