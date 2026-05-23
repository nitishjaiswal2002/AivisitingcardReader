import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name:               { type: String, required: true },
  createdAt:          { type: Date, default: Date.now },
  freeScansUsed:      { type: Number, default: 0 },
  totalScansUsed:     { type: Number, default: 0 },        // ✅ USed → Used
  isPremium:          { type: Boolean, default: false },
  plan:               { type: String, enum: ["free","pack_10","pack_25","pack_50","unlimited"], default: "free" },
  scansRemaining:     { type: Number, default: 0 },
  premiumExpiry:      { type: Date, default: null },
  premiumActivatedAt: { type: Date, default: null },       // ✅ date→Date, premuim→premium
  phone: { type: String, unique: true, sparse: true },
  firebaseUid: { type: String, unique: true, sparse: true },
  payments: [{
    orderId:   String,
    cfOrderId: String,
    plan:      String,
    amount:    Number,
    scans:     Number,
    paidAt:    { type: Date, default: Date.now },
    status:    { type: String, enum: ["pending","success","failed"], default: "pending" },
  }]
});

userSchema.methods.canScan = function(count = 1) {
  if (!this.isPremium && this.freeScansUsed < 5)
    return { allowed: true, reason: "free", remaining: 5 - this.freeScansUsed };
  if (this.isPremium && this.plan === "unlimited") {
    if (this.premiumExpiry && new Date() > this.premiumExpiry)
      return { allowed: false, reason: "expired" };
    return { allowed: true, reason: "unlimited" };
  }
  if (this.isPremium && this.scansRemaining >= count)
    return { allowed: true, reason: "pack", remaining: this.scansRemaining };
  return { allowed: false, reason: "exhausted" };
};

userSchema.methods.deductScan = function(count = 1) {
  this.totalScansUsed += count;                            // ✅ USed → Used
  if (!this.isPremium && this.freeScansUsed < 5) {
    this.freeScansUsed += count;
  } else if (this.isPremium && this.plan !== "unlimited") {
    this.scansRemaining = Math.max(0, this.scansRemaining - count);
    if (this.scansRemaining === 0) { this.isPremium = false; this.plan = "free"; }
  }
};

const User = mongoose.model("User", userSchema);           // ✅ mongoose.Model?.User → mongoose.model

const PLANS = {
  pack_10:   { label: "10 Cards",            scans: 10,    amount: 8   },
  pack_25:   { label: "25 Cards",            scans: 25,    amount: 20  },
  pack_50:   { label: "50 Cards",            scans: 50,    amount: 40  },
  unlimited: { label: "Unlimited (1 Month)", scans: 99999, amount: 200 },
};

const CF_APP_ID  = process.env.CASHFREE_APP_ID;
const CF_SECRET  = process.env.CASHFREE_SECRET_KEY;
const CF_BASE    = process.env.NODE_ENV === "production"
  ? "https://api.cashfree.com"
  : "https://sandbox.cashfree.com";
const CF_VERSION = "2023-08-01";

export { User, PLANS, CF_APP_ID, CF_SECRET, CF_BASE, CF_VERSION }; // ✅ cardSchema → correct export