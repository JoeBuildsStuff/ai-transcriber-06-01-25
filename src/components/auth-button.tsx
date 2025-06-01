
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthButton() {
  
  return (
    <div className="">
      <Button variant="link" asChild className="">
        <Link href="/signin">Sign in</Link>
      </Button>
    </div>
  );
}
