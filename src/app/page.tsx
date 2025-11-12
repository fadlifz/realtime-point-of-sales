import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DarkmodeToggle } from "@/components/common/darkmode-toggle";

export default function Home() {
  return (
    <div>
      <input></input>
      <Button>Hello</Button>
      <DarkmodeToggle />
    </div>
  );
}
