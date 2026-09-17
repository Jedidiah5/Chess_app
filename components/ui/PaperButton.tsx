import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { PencilFrame } from "@/components/ui/PencilFrame";

type Variant = "primary" | "ghost";

type BaseProps = {
  children: ReactNode;
  className?: string;
  variant?: Variant;
};

type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: undefined;
  };

type LinkProps = BaseProps & {
  href: string;
  disabled?: boolean;
};

export function PaperButton(props: ButtonProps | LinkProps) {
  const variant = props.variant ?? "primary";
  const className = props.className ?? "";
  const classes = [
    "paper-btn",
    variant === "primary" ? "paper-btn--primary" : "paper-btn--ghost",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <PencilFrame
        className="paper-stroke pointer-events-none absolute inset-0 h-full w-full"
        strokeWidth={1.55}
        inset={3}
      />
      <span className="relative z-[1]">{props.children}</span>
    </>
  );

  if ("href" in props && props.href) {
    if (props.disabled) {
      return (
        <span className={`${classes} pointer-events-none opacity-55`} aria-disabled>
          {inner}
        </span>
      );
    }
    return (
      <Link href={props.href} className={classes}>
        {inner}
      </Link>
    );
  }

  const {
    children: _c,
    className: _cl,
    variant: _v,
    href: _h,
    type = "button",
    ...rest
  } = props as ButtonProps;

  return (
    <button type={type} className={classes} {...rest}>
      {inner}
    </button>
  );
}
