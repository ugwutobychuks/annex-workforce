import { LogInIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthDialog } from "@/hooks/use-auth-dialog";

type SignInButtonProps = Omit<ButtonProps, "asChild" | "onClick"> & {
  label?: string;
  signInText?: string;
  showIcon?: boolean;
};

/**
 * Sign-in CTA. Opens the site-wide AuthDialog rather than navigating away,
 * so visitors can browse the marketplace and only see the modal when they
 * explicitly opt to sign in.
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
  const { open } = useAuthDialog();
  const text = signInText ?? label ?? "Sign in";
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => open()}
      {...rest}
    >
      {showIcon && <LogInIcon className="w-4 h-4" />}
      {text}
    </Button>
  );
}
