import { Component, OnInit, Input, SimpleChanges, SimpleChange, ViewChild } from '@angular/core'
import { serverurl } from '../serveraction'
import { LtechartService } from './ltechart.service'
import { DateselectService } from '../main/dateselect.service'
import { testlists } from '../testlists'

@Component({
  selector: 'app-lte',
  templateUrl: './lte.component.html',
  styleUrls: ['./lte.component.css']
})
export class LTEComponent implements OnInit {
  title = 'LTE Metrics'

  //// VARIABLES
  objectkeys = Object.keys
  tests = {}
  test_toadd = testlists.lte.available
  private chosendate
  selectedOptions
  options = 0
  buildnum
  numpassing
  numfailing
  diameter
  diameter_day

  //// INPUTS
  @ViewChild("startdateinput") startdateinput
  @ViewChild("enddateinput") enddateinput
  @ViewChild("dateinput") dateinput
  @ViewChild("alertmessage") alertmessage

  //// CHART INFORMATION
  id_line = 'ltechart_line'
  id_differentialline = 'ltechart_diff_line'
  width = "100%"
  height = "600"
  type_line = 'msline'
  dataFormat = 'json'
  dataSource_line
  dataSource_differentialline

  constructor(private ltechartService:LtechartService, private dateselectService:DateselectService) { }

  addTest(fabnumber) {
    // Creates test object with given fab number

    this.tests[fabnumber] = {
      'fab':null,
      'status':null,
      'tps':null,
      'txnum':null,
      'time':null,
      'values':[],
      'stats':{
          'min':null,
          'mean':null,
          'max':null,
          'prange':null
        }
    }
  }

  loadTests() {
    this.tests = {}
    for (let test of this.selectedOptions) {
      this.addTest(test)
    }
  }

  updateDate() {
    this.diameter_day = 50
    this.dateselectService.updateChosenDate(this.dateinput.nativeElement.value, 'lte')
    .then(obj => {
      this.chosendate = obj.chosendate
      this.buildnum = obj.build
      this.getData(obj.build)
    })
    .catch(err => {
      this.diameter_day = 0
      throw err
    })
  }

  getData(build) {
    // Fetches data of all tests from server
    fetch(`${serverurl}/lte/${build}` ,{
       method:'GET',
     })
     .then(res => res.json())
     .then(res => {
        if (res.success == true) {
          for (let test of this.selectedOptions) {
            this.tests[test].fab = test
            this.tests[test].status = res['data'][test]['status']
            this.tests[test].tps = res['data'][test]['tps'] != null ? parseFloat(res['data'][test]['tps']).toFixed(2) : res['data'][test]['tps']
            this.tests[test].txnum = res['data'][test]['txnum']
            this.tests[test].time = res['data'][test]['time'] == null ? null : res['data'][test]['time'] * 1000 + " ms"
          }
        }
        else {
          for (let test of this.selectedOptions) {
            this.tests[test].fab = test
            this.tests[test].status = null
            this.tests[test].tps = null
            this.tests[test].txnum = null
            this.tests[test].time = null
          }
        }
        this.loadStatuses()
        this.diameter_day = 0
      })
     .catch(err => {
         console.log("Logs may not be available yet!")
         throw err
     })
  }

  loadCharts(startdate, enddate) {
    if (! this.dateselectService.validateDates(startdate, enddate)) {
      this.alertmessage.nativeElement.innerHTML = "Start date must be earlier than the end date!"
      return
    }
    else {
      this.alertmessage.nativeElement.innerHTML = ""
    }

    // Loads charts with given date range
    this.diameter = 50
    this.ltechartService.loadLineChart(startdate, enddate, this.selectedOptions)
    .then(([line, diffline]) => {
      for (let i = 0; i < line.dataset.length; i++) {
        for (let datapoint of line.dataset[i].data) {
          this.tests[line.dataset[i].seriesname.split(" ")[0]].values.push(datapoint.value)
          datapoint.value = parseFloat(datapoint.value).toFixed(2)
        }
        for (let datapoint of diffline.dataset[i].data) {
          datapoint.value = parseFloat(datapoint.value).toFixed(2)
        }
      }
      this.dataSource_line = line
      this.dataSource_differentialline = diffline
      this.loadStats()
      this.diameter = 0
    })
    .catch(err => {
      this.diameter = 0
      throw err
    })
  }

  loadStats() {
    // Calculates and stores statistics
    for (let fabnum of this.selectedOptions) {
      let i_max = parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return Math.max(a,b)})),
          i_min = parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return Math.min(a,b)})),
          i_mean = (parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return parseFloat(a)+parseFloat(b)})) / this.tests[fabnum].values.length)
      this.tests[fabnum].max = i_max.toFixed(2)
      this.tests[fabnum].min = i_min.toFixed(2)
      this.tests[fabnum].mean = i_mean.toFixed(2)
      this.tests[fabnum].prange = (((i_min - i_mean)/i_mean) * 100).toFixed(2) + "% ~ +" + (((i_max - i_mean)/i_mean) * 100).toFixed(2) + "%"

      let q_max = parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return Math.max(a,b)})),
          q_min = parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return Math.min(a,b)})),
          q_mean = (parseFloat(this.tests[fabnum].values.reduce(function(a,b) {return parseFloat(a)+parseFloat(b)})) / this.tests[fabnum].values.length)

      this.tests[fabnum].max = q_max.toFixed(2)
      this.tests[fabnum].min = q_min.toFixed(2)
      this.tests[fabnum].mean = q_mean.toFixed(2)
      this.tests[fabnum].prange = (((q_min - q_mean)/q_mean) * 100).toFixed(2) + "% ~ +" + (((q_max - q_mean)/q_mean) * 100).toFixed(2) + "%"
    }
  }

  loadStatuses() {
    // Counts number passing and number failing

    let passing = 0,
        failing = 0;
    for (let fab of this.selectedOptions) {
      if (this.tests[fab].status == "PASSED") {
        passing += 1
      }
      else if (this.tests[fab].status == "FAILED") {
        failing += 1
      }
    }
    this.numpassing = passing
    this.numfailing = failing
  }

  loadAll(startdate, enddate) {
    this.diameter = 50
    this.loadTests()
    this.updateDate()
    // Checks if end date is valid i.e. today's test is done and logs are available
    fetch(`${serverurl}/build/lte`, {method:'GET'})
    .then(res => res.json())
    .then(res => {
      let endbuild = res[this.dateselectService.convertDateFormat(enddate)]
      this.dateselectService.checkEndDate(`${serverurl}/lte/${endbuild}`)
      .then(bool => {
        if (bool == true) {
          this.loadCharts(startdate, enddate)
        }
        else {
          // If logs unavailable, set end date to previous day
          let lastday = new Date(enddate)
          let prevday = new Date(lastday.setDate(lastday.getDate() - 1))
          this.enddateinput.nativeElement.value = [prevday.getMonth()+1, prevday.getDate(), prevday.getFullYear()].join('/')
          this.loadCharts(startdate, this.enddateinput.nativeElement.value)
        }
      })
    })
    .catch(err => {
      this.diameter = 0
      throw err
    })
  }

  ngOnInit() {
    //// Init chosen tests to load
    this.selectedOptions = testlists.lte.selected

    //// Init chart's date range values
    let weekRange = this.dateselectService.weekRange()
    this.startdateinput.nativeElement.value = weekRange[0]
    this.enddateinput.nativeElement.value = weekRange[1]

    //// Init single day data's date value
    let today = this.dateselectService.getToday()
    this.dateinput.nativeElement.value = today
    this.chosendate = this.dateselectService.convertDateFormat(today)

    //// Load charts and data
    this.loadAll(weekRange[0],weekRange[1])
  }
}