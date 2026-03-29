"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
    motion,
    MotionProps,
    MotionValue,
    useMotionValue,
    useSpring,
    useTransform,
} from "motion/react";
import React, { PropsWithChildren, useRef } from "react";

import { cn } from "@/lib/utils";

export interface DockProps extends VariantProps<typeof dockVariants> {
    className?: string;
    iconSize?: number;
    iconMagnification?: number;
    iconDistance?: number;
    direction?: "top" | "middle" | "bottom";
    children: React.ReactNode;
}

const DEFAULT_SIZE = 36;
const DEFAULT_MAGNIFICATION = 72;
const DEFAULT_DISTANCE = 40;

const dockVariants = cva(
    "liquidGlass-wrapper liquidGlass-dock mx-auto mt-8 flex h-[88px] w-max items-center justify-center",
);

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
    (
        {
            className,
            children,
            iconSize = DEFAULT_SIZE,
            iconMagnification = DEFAULT_MAGNIFICATION,
            iconDistance = DEFAULT_DISTANCE,
            direction = "middle",
            ...props
        },
        ref,
    ) => {
        const mouseX = useMotionValue(Infinity);

        const renderChildren = () => {
            return React.Children.map(children, (child) => {
                if (
                    React.isValidElement<DockIconProps>(child) &&
                    child.type === DockIcon
                ) {
                    return React.cloneElement(child, {
                        ...child.props,
                        mouseX: mouseX,
                        size: iconSize,
                        magnification: iconMagnification,
                        distance: iconDistance,
                    });
                }
                return child;
            });
        };

        return (
            <motion.div
                ref={ref}
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                {...props}
                className={cn(dockVariants(), {
                    "items-start": direction === "top",
                    "items-center": direction === "middle",
                    "items-end": direction === "bottom",
                }, className)}
            >
                <div className="liquidGlass-effect"></div>
                <div className="liquidGlass-tint"></div>
                <div className="liquidGlass-shine"></div>
                <div className="liquidGlass-content flex items-center justify-center w-full h-full">
                    {renderChildren()}
                </div>
            </motion.div>
        );
    },
);

Dock.displayName = "Dock";

export interface DockIconProps
    extends Omit<
        MotionProps & React.HTMLAttributes<HTMLDivElement>,
        "children"
    > {
    size?: number;
    magnification?: number;
    distance?: number;
    mouseX?: MotionValue<number>;
    className?: string;
    children?: React.ReactNode;
    props?: PropsWithChildren;
}

const DockIcon = ({
    size = DEFAULT_SIZE,
    magnification = DEFAULT_MAGNIFICATION,
    distance = DEFAULT_DISTANCE,
    mouseX,
    className,
    children,
    ...props
}: DockIconProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const padding = Math.max(6, size * 0.2);
    const defaultMouseX = useMotionValue(Infinity);

    const distanceCalc = useTransform(
        mouseX ?? defaultMouseX,
        (val: number) => {
            const bounds = ref.current?.getBoundingClientRect() ?? {
                x: 0,
                width: 0,
            };
            return val - bounds.x - bounds.width / 2;
        },
    );

    const sizeTransform = useTransform(
        distanceCalc,
        [-distance, 0, distance],
        [size, magnification, size],
    );

    const scaleSize = useSpring(sizeTransform, {
        mass: 0.1,
        stiffness: 150,
        damping: 12,
    });

    return (
        <motion.div
            ref={ref}
            style={{ width: scaleSize, height: scaleSize, padding }}
            className={cn(
                "liquidGlass-dockIcon flex aspect-square cursor-pointer items-center justify-center rounded-full",
                className,
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
};

DockIcon.displayName = "DockIcon";

export { Dock, DockIcon, dockVariants };
