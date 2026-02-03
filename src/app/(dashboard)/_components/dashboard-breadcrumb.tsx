"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

export default function DashboardBreadcrumb() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Paksa render hanya setelah nempel di browser (client)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Jangan render apa-apa di server

  const paths = pathname.split("/").filter((path) => path);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {paths.map((path, index) => {
          const isLast = index === paths.length - 1;
          const href = `/${paths.slice(0, index + 1).join("/")}`;

          return (
            <Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="capitalize">{path}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href} className="capitalize">
                    {path}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
