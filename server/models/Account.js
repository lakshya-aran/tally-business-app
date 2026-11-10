import mongoose from 'mongoose';

/**
 * An Account is the tenant: the business workspace a user signs up for.
 * It owns companies and users. Company-level documents (ledgers, invoices...)
 * additionally carry a companyId for per-company isolation.
 */
const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Account || mongoose.model('Account', accountSchema);
