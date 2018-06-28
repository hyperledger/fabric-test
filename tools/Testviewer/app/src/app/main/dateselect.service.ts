import { Injectable } from '@angular/core'
import { serverurl } from '../serveraction'

@Injectable({
  providedIn: 'root'
})
export class DateselectService {

  constructor() { }

  convertDateFormat(date) {
	  // Converts MM/DD/YYYY to YYYY-MM-DD

    let datesplit = date.split("/")
    let mo = datesplit[0].length < 2 ? '0' + datesplit[0] : '' + datesplit[0],
        d = datesplit[1].length < 2 ? '0' + datesplit[1] : '' + datesplit[1],
        yr = datesplit[2]
    return [yr,mo,d].join('-')
  }

  getToday() {
	  // Gets today's date in MM/DD/YYYY

	let date = new Date(),
	    mo = '' + (date.getMonth() + 1),
	    d = '' + date.getDate(),
	    yr = date.getFullYear()
	return [mo,d,yr].join('/')
  }

  weekRange() {
	  // Gets today's date and the date 7 days ago

  	let today = new Date()
    let lastweek = new Date(today.getFullYear(), today.getMonth(), today.getDate()-6)
    return [[lastweek.getMonth()+1, lastweek.getDate(), lastweek.getFullYear()].join("/"), [today.getMonth()+1, today.getDate(), today.getFullYear()].join("/")]
  }

  getStat(data) {
	  // Given a list of datapoints for chart, calculates the mean of data

  	let valuesum = 0
  	// let datavalues = []
  	let datalength = 0
  	for (let datapoint of data) {
  		if (isNaN(datapoint.value)) {
  			continue
  		}
  		// datavalues.push(parseFloat(datapoint.value))
  		valuesum += parseFloat(datapoint.value)
  		datalength += 1
  	}
  	let avg = (valuesum / datalength)
  	// let sqsum = 0
  	// for (let value of datavalues) {
  	// 	sqsum += Math.pow((value-avg),2)
  	// }
  	// let std = Math.sqrt((1 / (datalength - 1))*sqsum)
  	return avg.toFixed(2)
  }

  checkEndDate(url) {
	  // Checks if given url exists and is valid. Use this for checking if today's testing is completed or not.

  	return fetch(url, {method:'GET'})
  	.then(res => res.json())
  	.then(res => {
  		return res.success == true
  	})
  }

  getDateCategories(startdate, enddate) {
    // Calculates sequence of dates from startdate to enddate

  	let categories = []
    let currdate = new Date(enddate)
    while (currdate.getTime() >= new Date(startdate).getTime()) {
      categories.unshift({"label":[currdate.getFullYear(),("0" + (currdate.getMonth() + 1)).slice(-2), ("0" + currdate.getDate()).slice(-2)].join("-")})
      currdate.setDate(currdate.getDate()-1)
    }
    return categories
  }

  async updateChosenDate(date, test) {
	  // Gets build number based on chosen date for PTE/OTE/LTE

  	let chosendate = this.convertDateFormat(date)
  	let res = await (await fetch(`${serverurl}/build/${test}`, {method:'GET'})).json()
    return {'chosendate':chosendate, "build":res[chosendate]}
  }

  validateDates(startdate, enddate) {
    // Checks to see that start date is earlier than the enddate

    let start = new Date(startdate),
        end = new Date(enddate)
    return start.getTime() <= end.getTime()
  }
}
