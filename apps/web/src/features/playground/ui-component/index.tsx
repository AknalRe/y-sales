import React from "react";
import { cn } from "@/utils/lib/utils";

interface Fruit {
    label: string;
    value: string;
}

const fruits: Fruit[] = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Orange', value: 'orange' },
    { label: 'Pineapple', value: 'pineapple' },
    { label: 'Grape', value: 'grape' },
    { label: 'Mango', value: 'mango' },
    { label: 'Strawberry', value: 'strawberry' },
    { label: 'Blueberry', value: 'blueberry' },
    { label: 'Raspberry', value: 'raspberry' },
    { label: 'Blackberry', value: 'blackberry' },
    { label: 'Cherry', value: 'cherry' },
    { label: 'Peach', value: 'peach' },
    { label: 'Pear', value: 'pear' },
    { label: 'Plum', value: 'plum' },
    { label: 'Kiwi', value: 'kiwi' },
    { label: 'Watermelon', value: 'watermelon' },
    { label: 'Cantaloupe', value: 'cantaloupe' },
    { label: 'Honeydew', value: 'honeydew' },
    { label: 'Papaya', value: 'papaya' },
    { label: 'Guava', value: 'guava' },
    { label: 'Lychee', value: 'lychee' },
    { label: 'Pomegranate', value: 'pomegranate' },
    { label: 'Apricot', value: 'apricot' },
    { label: 'Grapefruit', value: 'grapefruit' },
    { label: 'Passionfruit', value: 'passionfruit' },
];

const apples = [
    { label: 'Gala', value: 'gala' },
    { label: 'Fuji', value: 'fuji' },
    { label: 'Honeycrisp', value: 'honeycrisp' },
    { label: 'GrannySmith', value: 'granny-smith' },
    { label: 'PinkLady', value: 'pink-lady' },
];

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
    DialogPortal,
    DialogBackdrop,
} from "@/components/ui-composed/cva/dialog";


import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogPortal,
    AlertDialogBackdrop,
    AlertDialogPopup,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogClose,
} from "@/components/ui-composed/cva/alert-dialog";


import {
    ToastButton,
    ToastList,
    ToastViewport,
    ToastPortal,
    ToastProvider,
} from '@/components/ui-composed/module/toast';


import {
    Combobox,
    ComboboxActionButtons,
    ComboboxPortal,
    ComboboxPositioner,
    ComboboxPopup,
    ComboboxEmpty,
    ComboboxList,
    ComboboxItem,
    ComboboxItemIndicator,
    ComboboxCheckIcon,
} from '@/components/ui-composed/module/combobox';

import {
    Field,
    FieldLabel,
    Select,
    SelectTrigger,
    SelectValue,
    SelectIcon,
    SelectPortal,
    SelectPositioner,
    SelectPopup,
    SelectScrollUpArrow,
    SelectScrollDownArrow,
    SelectChevronUpDownIcon,
    SelectCheckIcon,
    SelectList,
    SelectItem,
    SelectItemIndicator,
    SelectItemText
} from '@/components/ui-composed/module/select-field';



import {
    Tabs,
    TabsList,
    TabsTab,
    TabsIndicator,
    TabsPanel,
    OverviewIcon,
    ProjectIcon,
    PersonIcon
} from '@/components/ui-composed/cva/tabs';

import {
    Form,
    FormField,
    FormFieldLabel,
    FormFieldControl,
    FormFieldError,
    FormButton,
    FormAction,
} from "@/components/ui-composed/cva/form";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExampleSwitch } from '@/components/ui-composed/module/switch';
import { ExampleRadioGroup } from "@/components/ui-composed/module/radio";
import { ExampleCheckboxGroup } from "@/components/ui-composed/module/checkbox-group";
import { ExampleProgress } from "@/components/ui-composed/module/progress";
import { ToastHost, useOnceToast } from "@/utils/lib/ToastHost";
import SimpleRichTextEditor from "@/components/ui-composed/module/rich-text-editor";
import { ExampleToolbar } from "@/components/ui-composed/module/toolbar";
import { ExampleTooltip } from "@/components/ui-composed/module/tooltip";
import { ExampleToggleGroup } from "@/components/ui-composed/module/toggle-group";


type Employee = {
    id: string;
    userId: string;
    name: string;
    email: string;
    department: string;
    jobTitle: string;
    joinedDate: string;
    status: "Active" | "On Leave" | "Probation" | "Inactive";
    avatar?: string;
};

const employees: Employee[] = [
    {
        id: "1",
        userId: "U001",
        name: "John Doe",
        email: "john@example.com",
        department: "IT",
        jobTitle: "Software Engineer",
        joinedDate: "2022-01-15",
        status: "Active",
        avatar: "https://i.pravatar.cc/40?img=1",
    },
    {
        id: "2",
        userId: "U002",
        name: "Jane Smith",
        email: "jane@example.com",
        department: "HR",
        jobTitle: "HR Manager",
        joinedDate: "2021-07-10",
        status: "On Leave",
        avatar: "https://i.pravatar.cc/40?img=2",
    },
    {
        id: "3",
        userId: "U003",
        name: "Alice Johnson",
        email: "alice@example.com",
        department: "Finance",
        jobTitle: "Accountant",
        joinedDate: "2020-05-23",
        status: "Probation",
    },
    {
        id: "4",
        userId: "U004",
        name: "Bob Williams",
        email: "bob@example.com",
        department: "Marketing",
        jobTitle: "Marketing Specialist",
        joinedDate: "2019-11-05",
        status: "Inactive",
    },
];

const statusColors: Record<
    Employee["status"],
    { bg: string; text: string; border: string }
> = {
    Active: {
        bg: "bg-success/10 dark:bg-success/20",
        text: "text-success",
        border: "border-success/30 dark:border-success/40",
    },
    "On Leave": {
        bg: "bg-warning/10 dark:bg-warning/20",
        text: "text-warning-foreground",
        border: "border-warning/30 dark:border-warning/40",
    },
    Probation: {
        bg: "bg-info/10 dark:bg-info/20",
        text: "text-info",
        border: "border-info/30 dark:border-info/40",
    },
    Inactive: {
        bg: "bg-destructive/10 dark:bg-destructive/20",
        text: "text-destructive",
        border: "border-destructive/30 dark:border-destructive/40",
    },
};


export default function PlaygroundUiComponent() {
    const id = React.useId();

    useOnceToast("success", "Login berhasil", "Selamat datang 👋");

    return (
        <main
            className={cn("w-full flex-1 overflow-auto")}
        >
            <div className="grid p-0 m-0 place-items-start justify-center">
                <div className="bg-secondary rounded-2xl dark:shadow-none shadow-[0_6px_32px_rgba(40,60,150,0.12)] p-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-start gap-4 min-w-[360px] max-w-[90vw]">
                    <Card title="dialog">
                        <Dialog>
                            <DialogTrigger>Dialog</DialogTrigger>
                            <DialogPortal>
                                <DialogBackdrop />
                                <DialogContent>
                                    <DialogTitle>Notifications</DialogTitle>
                                    <DialogDescription>
                                        You are all caught up. Good job!
                                    </DialogDescription>
                                    <div className="flex justify-end mt-6">
                                        <DialogClose>
                                            Close
                                        </DialogClose>
                                    </div>
                                </DialogContent>
                            </DialogPortal>
                        </Dialog>
                    </Card>
                    <Card title="alert-dialog">
                        <AlertDialog>
                            <AlertDialogTrigger data-color="red">Alert Dialog</AlertDialogTrigger>
                            <AlertDialogPortal>
                                <AlertDialogBackdrop />
                                <AlertDialogPopup>
                                    <AlertDialogTitle>Discard draft?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You can't undo this action.
                                    </AlertDialogDescription>
                                    <div className="flex justify-end gap-4 mt-6">
                                        <AlertDialogClose>
                                            Cancel
                                        </AlertDialogClose>
                                        <AlertDialogClose data-color="red">
                                            Discard
                                        </AlertDialogClose>
                                    </div>
                                </AlertDialogPopup>
                            </AlertDialogPortal>
                        </AlertDialog>
                    </Card>
                    <Card title="toast">
                        <ToastProvider>
                            <ToastButton />
                            <ToastPortal>
                                <ToastViewport >
                                    <ToastList />
                                </ToastViewport>
                            </ToastPortal>
                        </ToastProvider>
                    </Card>
                    <Card title="input-dialog">
                        <Dialog>
                            <DialogTrigger>Form Dialog</DialogTrigger>
                            <DialogPortal>
                                <DialogBackdrop />
                                <DialogContent>
                                    <DialogTitle>Form Dialog</DialogTitle>
                                    <DialogDescription>
                                        You are all caught up. Good job!
                                    </DialogDescription>
                                    <Form>
                                        <FormField>
                                            <FormFieldLabel htmlFor="input-name">Name</FormFieldLabel>
                                            <FormFieldControl id="input-name" name="name" type="text" placeholder="Enter your name" />
                                            <FormFieldError>Name is required.</FormFieldError>
                                        </FormField>
                                        <FormAction>
                                            <FormButton type="submit">
                                                Submit
                                            </FormButton>
                                            <DialogClose>
                                                Close
                                            </DialogClose>
                                        </FormAction>
                                    </Form>
                                </DialogContent>
                            </DialogPortal>
                        </Dialog>
                    </Card>
                    <Card title="table-dialog">
                        <Dialog>
                            <DialogTrigger>Table Dialog</DialogTrigger>
                            <DialogPortal>
                                <DialogBackdrop />
                                <DialogContent className="max-w-4xl w-full p-6">
                                    <DialogTitle>Employee List</DialogTitle>
                                    <div className="overflow-x-auto mt-4 max-h-[400px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    {/* Select All */}
                                                    <TableHead className="w-[50px]">
                                                        {/* <Checkbox
                              checked={selectedRows.size === employees.length && employees.length > 0}
                              onCheckedChange={() => {
                                if (selectedRows.size === employees.length) {
                                  setSelectedRows(new Set());
                                } else {
                                  setSelectedRows(new Set(employees.map((e) => e.id)));
                                }
                              }}
                            /> */}
                                                    </TableHead>
                                                    <TableHead>ID</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                                                    <TableHead className="hidden md:table-cell">Department</TableHead>
                                                    <TableHead className="hidden lg:table-cell">Job Title</TableHead>
                                                    <TableHead className="hidden sm:table-cell">Joined Date</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>

                                            <TableBody>
                                                {employees.map((emp) => (
                                                    <TableRow key={emp.id}>
                                                        {/* Row checkbox */}
                                                        {/* <TableCell>
                              <Checkbox
                                checked={selectedRows.has(emp.id)}
                                onCheckedChange={() => {
                                  const newSet = new Set(selectedRows);
                                  newSet.has(emp.id) ? newSet.delete(emp.id) : newSet.add(emp.id);
                                  setSelectedRows(newSet);
                                }}
                              />
                            </TableCell> */}

                                                        <TableCell className="font-medium">{emp.userId}</TableCell>

                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="size-6">
                                                                    {emp.avatar ? (
                                                                        <AvatarImage src={emp.avatar} />
                                                                    ) : (
                                                                        <AvatarFallback className="text-[10px] font-semibold">
                                                                            {emp.name
                                                                                .split(" ")
                                                                                .map((n) => n[0])
                                                                                .join("")}
                                                                        </AvatarFallback>
                                                                    )}
                                                                </Avatar>
                                                                <span className="font-medium">{emp.name}</span>
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="hidden sm:table-cell">{emp.email}</TableCell>
                                                        <TableCell className="hidden md:table-cell">{emp.department}</TableCell>
                                                        <TableCell className="hidden lg:table-cell">{emp.jobTitle}</TableCell>
                                                        <TableCell className="hidden sm:table-cell">{emp.joinedDate}</TableCell>

                                                        <TableCell>
                                                            <span
                                                                className={cn(
                                                                    "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
                                                                    statusColors[emp.status].bg,
                                                                    statusColors[emp.status].text,
                                                                    statusColors[emp.status].border
                                                                )}
                                                            >
                                                                {emp.status}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="flex justify-end mt-6">
                                        <DialogClose>
                                            Close
                                        </DialogClose>
                                    </div>
                                </DialogContent>
                            </DialogPortal>
                        </Dialog>

                    </Card>
                    <Card title="empty">
                        <span className='text-gray-400'>Empty</span>
                    </Card>
                    <Card title="combobox">
                        <Combobox items={fruits}>
                            <div>
                                <label htmlFor={id} className='text-center block mb-2'>Choose a fruit</label>
                                <ComboboxActionButtons id={id} />
                            </div>

                            <ComboboxPortal>
                                <ComboboxPositioner sideOffset={4}>
                                    <ComboboxPopup >
                                        <ComboboxEmpty>No fruits found.</ComboboxEmpty>
                                        <ComboboxList>
                                            {(item: Fruit) => (
                                                <ComboboxItem key={item.value} value={item}>
                                                    <ComboboxItemIndicator>
                                                        <ComboboxCheckIcon />
                                                    </ComboboxItemIndicator>
                                                    <div>{item.label}</div>
                                                </ComboboxItem>
                                            )}
                                        </ComboboxList>
                                    </ComboboxPopup>
                                </ComboboxPositioner>
                            </ComboboxPortal>
                        </Combobox>
                    </Card>
                    <Card title="select">
                        <Field>
                            <FieldLabel>
                                Apple
                            </FieldLabel>
                            <Select items={apples} defaultValue={apples[0].value}>
                                <SelectTrigger>
                                    <SelectValue />
                                    <SelectIcon>
                                        <SelectChevronUpDownIcon />
                                    </SelectIcon>
                                </SelectTrigger>

                                <SelectPortal>
                                    <SelectPositioner sideOffset={8}>
                                        <SelectPopup>
                                            <SelectScrollUpArrow />
                                            <SelectList>
                                                {apples.map(({ label, value }) => (
                                                    <SelectItem key={label} value={value}>
                                                        <SelectItemIndicator>
                                                            <SelectCheckIcon />
                                                        </SelectItemIndicator>
                                                        <SelectItemText>{label}</SelectItemText>
                                                    </SelectItem>
                                                ))}
                                            </SelectList>
                                            <SelectScrollDownArrow />
                                        </SelectPopup>
                                    </SelectPositioner>
                                </SelectPortal>
                            </Select>
                        </Field>
                    </Card>
                    <Card title="switch">
                        <ExampleSwitch />
                    </Card>
                    <Card title="radio">
                        <ExampleRadioGroup />
                    </Card>
                    <Card title="checkbox">
                        <ExampleCheckboxGroup />
                    </Card>
                    <Card title="progress">
                        <ExampleProgress />
                    </Card>
                    <Card title="tabs" className="col-span-2">
                        <Tabs defaultValue="overview" className="translate-y-0 xs:translate-y-2.5">
                            <TabsList >
                                <TabsTab value="overview">
                                    Overview
                                </TabsTab>
                                <TabsTab value="projects">
                                    Projects
                                </TabsTab>
                                <TabsTab value="account">
                                    Account
                                </TabsTab>
                                <TabsIndicator orientation='row' />
                            </TabsList>
                            <TabsPanel value="overview">
                                <OverviewIcon />
                            </TabsPanel>
                            <TabsPanel value="projects">
                                <ProjectIcon />
                            </TabsPanel>
                            <TabsPanel value="account">
                                <PersonIcon />
                            </TabsPanel>
                        </Tabs>
                    </Card>
                    <Card title="tooltip">
                        <ExampleTooltip />
                    </Card>
                    <Card title="toolbar" className="col-span-3">
                        <ExampleToolbar />
                    </Card>
                    <Card title="editor-text" className="col-span-2">
                        <SimpleRichTextEditor />
                    </Card>
                    <Card title="toggle-group">
                        <ExampleToggleGroup />
                    </Card>
                    <Card title="empty">
                        <span className='text-gray-400'>Empty</span>
                    </Card>
                </div>
            </div>
            <ToastHost />
        </main>
    );
}

function Card({ children, title, className }: { children: any, title: any, className?: any }) {

    return (
        <div className={cn(
            "relative flex flex-col items-center justify-center min-h-[220px] rounded-[12px] bg-card text-card-foreground dark:shadow-none shadow-[0_1px_6px_rgba(80,120,200,0.08)] p-[1.2rem_1.5rem]",
            className
        )}
        >
            <div className="absolute left-0 top-0 w-full bg-muted text-muted-foreground text-xs font-medium py-1 px-0 rounded-t-[12px] text-center">
                {title}
            </div>
            {children}
        </div>
    );
}

