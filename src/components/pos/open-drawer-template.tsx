
import React from 'react';

export const OpenDrawerTemplate = () => {
    return (
        <div id="open-drawer-print" className="hidden print:block">
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #open-drawer-print, #open-drawer-print * {
                        visibility: visible;
                    }
                    #open-drawer-print {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 1px;
                        height: 1px;
                        overflow: hidden;
                    }
                }
            `}</style>
            .
        </div>
    );
};
