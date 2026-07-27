export interface ICustomer {
    _id?: string;
    name: string;
    address?: string;
    phone?: string;
    identityNumber?: string;
    whatsappNumber?: string;
    email?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface ICourt {
    _id?: string;
    name: string;
}
export interface ICaseType {
    _id?: string;
    name: string;
}
export interface IAnnouncementType {
    _id?: string;
    name: string;
}
export interface ICase {
    _id?: string;
    customerId: string;
    customerName?: string;
    opponentName: string;
    clientCapacity: string;
    opponentCapacity: string;
    courtId: string;
    courtName?: string;
    circuitNumber: string;
    caseNumber: string;
    caseYear: number;
    caseTypeId: string;
    caseTypeName?: string;
    caseSubject: string;
    createdDate?: string;
}
export interface ICaseSession {
    _id?: string;
    caseId: string;
    caseNumber?: string;
    sessionNumber: number;
    sessionDate: string;
    courtId: string;
    courtName?: string;
    rollNumber: string;
    hallNumber: string;
    subject: string;
    sessionType: string;
    sessionDecision: string;
    nextSessionDate?: string;
    notes: string;
}
export interface ICaseDocument {
    _id?: string;
    caseId: string;
    documentName: string;
    documentType: string;
    fileId: string;
    fileName: string;
    notes: string;
    createdDate?: string;
}
export interface ISessionDocument {
    _id?: string;
    caseSessionId: string;
    documentName: string;
    fileId: string;
    fileName: string;
    documentType?: string;
    createdDate?: string;
}
export interface ICaseAnnouncement {
    _id?: string;
    caseId: string;
    caseNumber?: string;
    announcementNumber: string;
    courtId: string;
    courtName?: string;
    announcementTypeId: string;
    announcementTypeName?: string;
    recipientName: string;
    recipientAddress: string;
    subject: string;
    documentType: string;
    bailiffName: string;
    deliveryDate?: string;
    receiptDate?: string;
    sessionDate?: string;
    notes: string;
}
export interface IAnnouncementDocument {
    _id?: string;
    caseAnnouncementId: string;
    documentName: string;
    fileId: string;
    fileName: string;
    documentType?: string;
    createdDate?: string;
}
export interface ICustomerDocument {
    _id?: string;
    customerId: string;
    documentName: string;
    fileId: string;
    fileName: string;
    documentType?: string;
    createdDate?: string;
}
export interface IDocumentTemplate {
    _id?: string;
    title: string;
    category?: string;
    documentType?: string;
    fileId: string;
    fileName: string;
    notes?: string;
    createdDate?: string;
}
export interface IFeeAgreement {
    _id?: string;
    customerId: string;
    customerName?: string;
    caseId?: string;
    caseNumber?: string;
    totalAmount: string;
    agreementDate: string;
    notes: string;
    paidAmount?: string;
    remainingAmount?: string;
}
export interface IFeePayment {
    _id?: string;
    feeAgreementId: string;
    amount: string;
    paymentDate: string;
    notes: string;
}
export interface IFeeHistory {
    _id?: string;
    feeAgreementId: string;
    oldTotalFee: string;
    newTotalFee: string;
    reason: string;
    changedBy: string;
    changedAt: string;
}
export interface IExpense {
    _id?: string;
    customerId?: string;
    customerName?: string;
    caseId?: string;
    caseNumber?: string;
    amount: string;
    expenseDate: string;
    description: string;
    category: string;
}
export interface IExpenseDocument {
    _id?: string;
    expenseId: string;
    fileId: string;
    fileName: string;
    addedDate?: string;
}
export interface ILawyerProfile {
    _id?: string;
    name: string;
    phone: string;
    address: string;
}
export interface ISystemInfo {
    _id?: string;
    key: string;
    value: string;
}
export interface IApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
export interface IDashboardStats {
    totalCustomers: number;
    totalCases: number;
    activeCases: number;
    upcomingSessions: number;
    totalFees: string;
    collectedFees: string;
    remainingFees: string;
    totalExpenses: string;
}
export interface ICustomerDossier {
    customer: ICustomer;
    cases: ICase[];
    sessions: ICaseSession[];
    announcements: ICaseAnnouncement[];
    feeAgreements: IFeeAgreement[];
    expenses: IExpense[];
    documents: ICustomerDocument[];
    stats: {
        totalCases: number;
        totalSessions: number;
        totalAnnouncements: number;
        totalFees: string;
        paidFees: string;
        remainingFees: string;
        totalExpenses: string;
    };
}
export interface ICourtDossier {
    court: ICourt;
    cases: ICase[];
    sessions: ICaseSession[];
    announcements: ICaseAnnouncement[];
    stats: {
        totalCases: number;
        totalSessions: number;
        totalAnnouncements: number;
        upcomingSessions: number;
    };
}
export interface INotificationItem {
    id: string;
    type: 'session' | 'announcement';
    title: string;
    description: string;
    date: string;
    caseNumber?: string;
    courtName?: string;
    urgency: 'high' | 'medium' | 'low';
}
export interface IBackupSettings {
    autoBackupEnabled: boolean;
    backupFolder: string;
    lastBackupDate?: string;
}
export interface ITask {
    _id?: string;
    title: string;
    description?: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in_progress' | 'completed';
    customerId?: string;
    caseId?: string;
    createdAt?: string;
    updatedAt?: string;
}
//# sourceMappingURL=index.d.ts.map