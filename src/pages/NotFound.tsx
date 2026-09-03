import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <p className="text-5xl font-bold text-primary">404</p>
        <p className="text-muted-foreground">This page could not be found.</p>
        <Button asChild variant="secondary">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
