import { Injectable } from '@angular/core';
import { serverurl } from '../serveraction';
import { DateselectService } from '../main/dateselect.service'

@Injectable({
  providedIn: 'root'
})
export class OtechartService {

  constructor(private dateselectService:DateselectService) { }

  sortBySeriesName(dataset) {
  	return dataset.sort(function(a,b) {return a.seriesname < b.seriesname ? -1 : 1})
  }

  async loadLineChart(startdate, enddate, tests) {
	// Loads line chart

  	//// Calculate categories i.e. dates for x-axis
    let categories = []
    let currdate = new Date(enddate);
    while (currdate.getTime() >= new Date(startdate).getTime()) {
      categories.unshift({"label":[currdate.getFullYear(),("0" + (currdate.getMonth() + 1)).slice(-2), ("0" + currdate.getDate()).slice(-2)].join("-")});
      currdate.setDate(currdate.getDate()-1);
    }
    //// Gets dataset for plotting
    let dataset = [],
    	differentialdataset = [],
    	dataSourceArray;

    let res = await (await fetch(`${serverurl}/build/ote`, {method:'GET'})).json()
    for (let fabnum of tests) {
      let data_ote = [],
      	  promisearray = []
      for (let category of categories) {
      	// Fills promisearray with fetch of each date in category for current fabnum
        promisearray.push(fetch(`${serverurl}/ote/${fabnum}/${res[category['label']]}` ,{
           method:'GET',
         })
        .then(res => res.json())
        .then(res => {
        	let value;
        	if (res.success) {
        		value = res['tps']
        	}
			data_ote.push({
				"value":value,
				"date":new Date(category["label"])
			})
        })
      )}
      // When all promises are resolved, push this fab's data to dataset (i.e. 1 line in chart is being added to the rest)
      dataSourceArray = Promise.all(promisearray)
		.then((_) => {
			let avg = this.dateselectService.getStat(data_ote)
			let data_ote_sorted = data_ote.sort(function(a,b) { return a.date.getTime()-b.date.getTime() });
			dataset.push({
			  "seriesname":`${fabnum} (Avg ${avg})`,
			  "data":data_ote_sorted
			})

			//// Make differential chart data using the regular data
	        let differentialdata_ote = [];
	        for (let datapoint of data_ote_sorted) {
	        	differentialdata_ote.push({
	        		"value":100*(parseFloat(datapoint.value) - parseFloat(avg))/parseFloat(avg),
	        		"date":datapoint.date
	        	})
	        }

	        differentialdataset.push({
	        	"seriesname":`${fabnum} (Avg ${avg})`,
	        	"data":differentialdata_ote
	        })

	        // Sorting dataset keeps order of tests consistent. The way it's written, whole dataset is re-sorted
	        // every time new data is pushed
	        dataset = this.sortBySeriesName(dataset)

			let dataSource_line = {
			    "chart": {
			        "caption": "OTE Metrics",
			        "subCaption": "TPS",
			        "numberprefix": "",
			        "theme": "fint",
			        "baseFontSize": "12",
			        "yaxisname":"TPS",
			        "decimals": "2"
			    },
			    "categories":[
			      {"category":categories}
			    ],
			    "dataset": dataset
			}
			let dataSource_differential_line = {
	        	"chart": {
	                "caption": "OTE Differential",
	                "subCaption": "Percentage Difference from Average",
	                "numbersuffix": "%",
	                "theme": "fint",
	                "baseFontSize": "12",
	                "yaxisname":"Percentage %",
	                "decimals": "2"
	            },
	            "categories":[
	              {"category":categories}
	            ],
	            "dataset": differentialdataset
	        }
		return [dataSource_line, dataSource_differential_line]
		})
    }
    return dataSourceArray
  }
}
