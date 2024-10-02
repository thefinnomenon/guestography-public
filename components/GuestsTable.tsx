import React, { useEffect, useState } from "react";

import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  flexRender,
  RowData,
} from "@tanstack/react-table";
import { Guest, GuestEventRecord } from "../types";
import { MdOutlineClose } from "react-icons/md";
import { removeGuest } from "../pages/[eventId]/manage";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}

const defaultColumn: Partial<ColumnDef<Partial<GuestEventRecord>>> = {
  cell: ({ getValue, row: { index }, column: { id }, table }) => {
    const initialValue = getValue();

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState(initialValue);

    // When the input is blurred, we'll call our table meta's updateData function
    const onBlur = () => {
      table.options.meta?.updateData(index, id, value);
    };

    // If the initialValue is changed external, sync it up with our state
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);

    let placeholder = "";
    switch (id) {
      case "firstName":
        placeholder = "First";
        break;
      case "lastName":
        placeholder = "Last";
        break;
      case "phone":
        placeholder = "###-###-####";
        break;
    }

    return <p className="p-2">{`${value}`}</p>;
  },
};

type Props = {
  eventId: string;
  guests: Partial<GuestEventRecord>[];
  setGuests(guests: Partial<GuestEventRecord>[]): void;
};

export default function GuestsTable({ eventId, guests, setGuests }: Props) {
  const columns = React.useMemo<ColumnDef<Partial<GuestEventRecord>>[]>(
    () => [
      {
        header: "First Name",
        accessorFn: (row) => row.firstName,
        id: "firstName",
      },
      {
        header: "Last Name",
        accessorFn: (row) => row.lastName,
        id: "lastName",
      },
      {
        header: "Phone",
        accessorFn: (row) => row.phone,
        id: "phone",
      },
      {
        id: "delete",
        accessor: "delete",
        cell: (row) => (
          <MdOutlineClose
            className="cursor-pointer text-red-500 mx-auto"
            size={24}
            onClick={() => {
              const phone = guests[row.row.index].phone;
              if (!phone) return;
              removeGuest(eventId, guests, phone, setGuests);
            }}
          />
        ),
        size: 50,
      },
    ],
    [eventId, guests, setGuests]
  );

  const table = useReactTable({
    data: guests,
    columns,
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
    // Provide our updateData function to our table meta
    meta: {
      updateData: (rowIndex, columnId, value) => {
        const updatedGuests = [...guests];
        // @ts-ignore
        updatedGuests[rowIndex][columnId] = value;
        setGuests(updatedGuests);
      },
    },
  });

  return (
    <div className="overflow-auto my-4 border border-gray-300 rounded-md shadow-sm h-80">
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <th key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <div>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            return (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  return (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
