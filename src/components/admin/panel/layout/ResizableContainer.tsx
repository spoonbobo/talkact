"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { motion } from "framer-motion";

const MotionBox = motion.create(Box);

interface ResizableContainerProps {
    topComponent: React.ReactNode;
    bottomComponent: React.ReactNode;
    initialTopHeight?: number;
    minTopHeight?: number;
    minBottomHeight?: number;
}

export default function ResizableContainer({
    topComponent,
    bottomComponent,
    initialTopHeight = 65,
    minTopHeight = 30,
    minBottomHeight = 20,
}: ResizableContainerProps) {
    const [topHeight, setTopHeight] = useState(initialTopHeight);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startHeight = useRef(0);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            e.preventDefault();
            isDragging.current = true;
            startY.current = e.clientY;
            startHeight.current = topHeight;
            document.body.style.userSelect = "none";
            document.body.style.cursor = "ns-resize";
        },
        [topHeight]
    );

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;

        const containerHeight = containerRef.current.offsetHeight;
        const deltaY = e.clientY - startY.current;
        const deltaPercent = (deltaY / containerHeight) * 100;
        const newTopHeight = startHeight.current + deltaPercent;

        // Constrain the resize
        if (newTopHeight >= minTopHeight && 100 - newTopHeight >= minBottomHeight) {
            setTopHeight(newTopHeight);
        }
    }, [minTopHeight, minBottomHeight]);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
    }, []);

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
        const handleGlobalMouseUp = () => handleMouseUp();

        document.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
        document.addEventListener("mouseup", handleGlobalMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleGlobalMouseMove);
            document.removeEventListener("mouseup", handleGlobalMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return (
        <Box
            width="100%"
            height="100%"
            position="relative"
            overflow="hidden"
            flexDirection="column"
            ref={containerRef}
        >
            {/* Top component */}
            <MotionBox
                width="100%"
                height={`${topHeight}%`}
                overflow="auto"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {topComponent}
            </MotionBox>

            {/* Draggable divider */}
            <Box
                width="100%"
                height="4px"
                cursor="ns-resize"
                position="relative"
                onMouseDown={handleMouseDown}
                _hover={{ bg: "rgba(0, 0, 0, 0.1)" }}
                _active={{ bg: "rgba(0, 0, 0, 0.2)" }}
                _before={{
                    content: '""',
                    position: "absolute",
                    top: "-2px",
                    width: "100%",
                    height: "8px",
                    cursor: "ns-resize",
                }}
            />

            {/* Bottom component */}
            <MotionBox
                width="100%"
                height={`${100 - topHeight}%`}
                overflow="auto"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {bottomComponent}
            </MotionBox>
        </Box>
    );
} 