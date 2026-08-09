import React from 'react';
import { usePermissionGuard } from '../hooks/usePermissionGuard';
import { UserPermissions } from '../types';

export interface PermissionGuardProps {
    module: keyof UserPermissions | string;
    action: 'create' | 'read' | 'update' | 'delete';
    isOwner?: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    mode?: 'hide' | 'disable';
    disabledClassName?: string;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    module,
    action,
    isOwner = false,
    children,
    fallback = null,
    mode = 'hide',
    disabledClassName = 'opacity-60 cursor-not-allowed pointer-events-none'
}) => {
    const hasAccess = usePermissionGuard(module, action, isOwner);

    if (hasAccess) {
        return <>{children}</>;
    }

    if (mode === 'disable') {
        return (
            <>
                {React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        const existingClassName = (child.props as any).className || '';
                        const newClassName = `${existingClassName} ${disabledClassName}`.trim();
                        
                        return React.cloneElement(child as React.ReactElement<any>, {
                            disabled: true,
                            'aria-disabled': true,
                            className: newClassName,
                            onClick: (e: React.MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        });
                    }
                    return child;
                })}
            </>
        );
    }

    return <>{fallback}</>;
};

