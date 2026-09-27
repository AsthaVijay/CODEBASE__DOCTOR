import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Codebase Doctor — Diagnose. Treat. Verify.',description:'A clear path to a healthier codebase. Review every treatment, approve every change, verify every result.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
