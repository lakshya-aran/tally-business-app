import mongoose from 'mongoose';

/**
 * Append-only audit trail. Every create/update/delete of financial or
 * security-relevant data writes one entry. Entries are never updated or deleted
 * through the application.
 */
const auditLogSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true }, // e.g. 'auth.login', 'invoice.cancel'
    entity: { type: String }, // e.g. 'User', 'SalesInvoice'
    entityId: { type: mongoose.Schema.Types.ObjectId },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    meta: { type: mongoose.Schema.Types.Mixed },
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ account: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, entity: 1, entityId: 1, createdAt: -1 });

function blockMutation() {
  throw new Error('Audit log entries are immutable');
}
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], blockMutation);

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
