import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardContent className="pt-10 pb-8 text-center">
          <div className="mb-6">
            <span className="text-8xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              404
            </span>
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-foreground">
            Page introuvable
          </h1>
          <p className="mb-8 text-muted-foreground">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="gap-2 bg-gradient-primary hover:opacity-90"
            >
              <Home className="h-4 w-4" />
              Retour au Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
