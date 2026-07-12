export async function load({ locals }) {
	return locals.getVerifiedAuth();
}
