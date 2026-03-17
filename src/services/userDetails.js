import { db } from "../config/db.js";

export async function UserDetails(req, res) {

  console.log("HEADERS:", req.headers);
  console.log("BODY:", req.body);

  const data = typeof req.body === "string"
  ? JSON.parse(req.body)
  : req.body;

  const {
    pk,
    name,
    user,
    userType,
    institutionSubType,
    urd,
    gstin,
    fssai,
    phone,
    address,
    deliveryAddress,
    pincode
  } = data;

  // ✅ Safety check
  if (!pk) {
    return res.status(400).json({
      message: "pk is required",
      received: req.body
    });
  }

  const prefix = user === "Customer" ? "BYR" : "SLR";

  try {

    const [rows] = await db.query(
      `SELECT userCode
       FROM users
       WHERE pk = ?
       AND userCode LIKE ?
       ORDER BY CAST(SUBSTRING(userCode, 4) AS UNSIGNED) DESC
       LIMIT 1`,
      [pk, `${prefix}%`]
    );

    let nextNumber = 1;

    if (rows.length > 0) {
      const lastCode = rows[0].userCode;
      const number = parseInt(lastCode.replace(prefix, ""));
      nextNumber = number + 1;
    }

    const userCode = `${prefix}${String(nextNumber).padStart(3, "0")}`;

    await db.query(
      `INSERT INTO users
      (pk,userCode,name,user,userType,institutionSubType,urd,gstin,fssai,phone,address,deliveryAddress,pincode)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        pk,
        userCode,
        name,
        user,
        userType,
        institutionSubType,
        urd,
        gstin,
        fssai,
        phone,
        address,
        deliveryAddress,
        pincode
      ]
    );

    res.json({
      message: "User created",
      userCode
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

}


export async function GetUserDetails(req, res) {

  const { orgId } = req.query;

  try {

    const [rows] = await db.query(
      `SELECT * FROM users WHERE pk = ?`,
      [orgId]
    );

    const customers = [];
    const suppliers = [];

    rows.forEach((item) => {

      if (item.userCode && item.userCode.startsWith("BYR")) {
        customers.push(item);
      }

      if (item.userCode && item.userCode.startsWith("SLR")) {
        suppliers.push(item);
      }

    });

    res.json({
      customers,
      suppliers
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}