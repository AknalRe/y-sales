import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/lib/utils";
import { ArrowLeft01Icon, ArrowRight01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DATATABLE_LIMIT_OPTIONS } from "@/config/constants";

import type { VariantProps } from "class-variance-authority";
import { headerIcon } from "./style";

type HeaderProps = {
    title: React.ReactNode;
    icon?: React.ReactNode;
    iconAppearance?: VariantProps<typeof headerIcon>["appearance"];
    children?: React.ReactNode;
    className?: string;
};


function DataTable({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-xl border bg-card overflow-hidden w-full">
            {children}
        </div>
    );
}


function Header({
    title,
    icon,
    iconAppearance,
    children,
    className,
}: HeaderProps) {
    return (
        <div
            className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b",
                className
            )}
        >
            <div className="flex items-center gap-2">
                {icon && (
                    <span className={headerIcon({ appearance: iconAppearance })}>
                        {icon}
                    </span>
                )}

                <span className="font-medium text-muted-foreground">
                    {title}
                </span>
            </div>

            {children && (
                <div className="flex flex-wrap items-center gap-2">
                    {children}
                </div>
            )}
        </div>
    );
}

function Search({ value, onChange, placeholder }: {
    value?: string
    onChange: (value: string) => void
    placeholder?: string
}) {
    return (
        <div className="relative flex-1 sm:flex-none">
            <HugeiconsIcon
                icon={Search01Icon}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />

            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder ?? "Cari..."}
                className="pl-9 w-full sm:w-[220px] h-9"
            />
        </div>
    )
}

function Content({ children }: { children: React.ReactNode }) {
    return <div className="overflow-x-auto">{children}</div>;
}


function Footer({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div
            className={cn(
                "flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t",
                className
            )}
        >
            {children}
        </div>
    );
}

function Pagination({
    currentPage,
    totalPages,
    loading,
    onChange,
}: {
    currentPage: number;
    totalPages: number;
    loading?: boolean;
    onChange: (page: number) => void;
}) {
    return (
        <div className="flex items-center gap-3">
            <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage === 1 || loading}
                onClick={() => onChange(currentPage - 1)}
            >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            </Button>

            <span className="text-sm text-muted-foreground">
                Halaman {currentPage} dari {totalPages}
            </span>

            <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage === totalPages || loading}
                onClick={() => onChange(currentPage + 1)}
            >
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Button>
        </div>
    );
}

function Summary({
    currentPage,
    pageSize,
    total,
}: {
    currentPage: number;
    pageSize: number;
    total: number;
}) {
    if (pageSize === -1) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                    Menampilkan semua data ({total})
                </span>
            </div>
        );
    }

    const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

    return (
        <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
                Menampilkan {start} sampai {end} dari {total} data
            </span>
        </div>
    );
}

function PageSize({ pageSize, onChange }: {
    pageSize: number
    onChange: (size: number) => void
}) {
    const currentLabel =
        DATATABLE_LIMIT_OPTIONS.find((option) => option.value === pageSize)?.label ??
        String(pageSize);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 h-8 px-2.5 rounded-md border border-border bg-accent hover:bg-muted shadow-xs text-sm font-medium">
                Tampilkan {currentLabel}
                <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-3 rotate-90"
                />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                {DATATABLE_LIMIT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={cn(pageSize === option.value && "bg-muted")}
                    >
                        Tampilkan {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


DataTable.Header = Header;
DataTable.Search = Search;
DataTable.Content = Content;
DataTable.Footer = Footer;
DataTable.Pagination = Pagination;
DataTable.Summary = Summary;
DataTable.PageSize = PageSize;

export default DataTable;

