const cheerio = require('cheerio');
const request = require("request");

function calc_buildnum(curr_date, base) {
	// Calculates build number using given date and a base date.

	split_curr_date = curr_date.split("-");
	let yr = split_curr_date[0]
		mo = split_curr_date[1]
		d = split_curr_date[2]
	base_date = Object.keys(base)[0]
	base_buildnum = base[base_date]
	split_base_date = base_date.split("-")
	let base_yr = split_base_date[0]
		base_mo = split_base_date[1]
		base_d = split_base_date[2]
	return base_buildnum + Math.round(Math.abs((new Date(yr, mo-1, d).getTime() - new Date(base_yr, base_mo-1, base_d).getTime())/(86400000)));
}

module.exports = {
	calc_buildnum: calc_buildnum
}