import { Link } from "react-router-dom";
import { LogInIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignInButtonProps = Omit<ButtonProps, "asChild"> & {
  label?: string;
  signInText?: string;
  showIcon?: boolean;
};

/**
 * Local sign-in CTA. Sends the visitor to /login, which owns the email +
 * password form via @convex-dev/auth. Accepts button variants/sizes so it
 * fits both the marketing header and the app shells.
 */
export function SignInButton({
  label,
  signInText,
  showIcon,
  className,
  variant,
  size,
  ...rest
}: SignInButtonProps) {
  const text = signInText ?? label ?? "Sign in";
  return (
    <Button asChild variant={variant} size={size} className={cn(className)} {...rest}>
      <Link to="/login">
        {showIcon && <LogInIcon className="w-4 h-4" />}
        {text}
      </Link>
    </Button>
  );
}
