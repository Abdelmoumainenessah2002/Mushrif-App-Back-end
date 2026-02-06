// utils/roleHierarchy.js
const ROLE_RANK = {
  user: 4,
  support_agent: 3,
  admin: 2,
  super_admin: 1
};

function hasMinRole(userRole, requiredRole) {
  return ROLE_RANK[userRole] <= ROLE_RANK[requiredRole];
}

module.exports = { hasMinRole };
