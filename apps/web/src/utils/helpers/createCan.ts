export function createCan(userPermissions: string[]) {
    /**
     * Mengembalikan true jika user punya permission tertentu
     * @param permission string format: "module.action"
     */
    return function can(permission: string): boolean {
      return userPermissions.includes("*") || userPermissions.includes(permission);
    };
  }
  