"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "@/components/icons/chevron-left";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DeleteIcon } from "@/components/icons/delete";


interface DeleteButtonProps {
    onDelete: () => void | Promise<void>;
    isLoading?: boolean;
    confirmText?: string;
    size?: "default" | "sm" | "lg" | "icon";
    disabled?: boolean;
    className?: string;
}

export default function DeleteButton({ 
    onDelete, 
    isLoading = false, 
    confirmText = "Confirm",
    size = "icon",
    disabled = false,
    className = ""
}: DeleteButtonProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDelete = () => {
        setShowConfirm(true);
    };

    const handleCancel = () => {
        setShowConfirm(false);
    };
    
    const handleConfirm = async () => {
        try {
            await onDelete();
            setShowConfirm(false);
        } catch (error) {
            // Keep confirmation state if delete fails
            console.error("Delete failed:", error);
        }
    };

    return (
        <motion.div 
            layout
            className={`flex items-center gap-2 ${className}`}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
            }}
        >
            <AnimatePresence mode="popLayout">
                {showConfirm && (
                    <motion.div
                        layout
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 500, 
                            damping: 30
                        }}
                    >
                        <Button 
                            variant="outline" 
                            size={size}
                            onClick={handleCancel}
                            disabled={disabled || isLoading}
                        >
                            <ChevronLeftIcon  />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.div
                layout
                initial={false}
                animate={{
                    width: showConfirm ? (size === "icon" ? 142 : 120) : (size === "icon" ? 34 : 48)
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                }}
                className="overflow-hidden relative"
            >
                <Button 
                    variant={showConfirm ? "red" : "outline"} 
                    size={size}
                    onClick={showConfirm ? handleConfirm : handleDelete}
                    disabled={disabled || isLoading}
                    className="w-full whitespace-nowrap flex items-center justify-start px-2"
                >
                    <DeleteIcon className="" />
                    <AnimatePresence>
                        {showConfirm && (
                            <motion.span
                                key="confirm-text"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{
                                    duration: 0.3,
                                    delay: 0.1,
                                    ease: "easeOut"
                                }}
                                className="inline-block"
                            >
                                {isLoading ? "..." : confirmText}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Button>
            </motion.div>
        </motion.div>
    );
}