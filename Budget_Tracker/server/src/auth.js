import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET is not set. Copy .env.example to .env and set a real secret.");
}

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      familyId: user.family_id,
    },
    SECRET,
    { expiresIn: "30d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
