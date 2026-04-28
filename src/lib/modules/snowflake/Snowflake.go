package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"syscall/js"
	"time"
)

const base64EncodeMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
var base64DecodeMap [256]byte

type SnowflakeNode struct {
	lock		 sync.Mutex
	epoch        time.Time
	time         int64
	worker       int64
	sequence     int64

	workerMax    int64
	workerMask   int64
	sequenceMask int64

	timeShift    uint8
	workerShift  uint8
}

type SnowflakeOptions struct {
	epoch		 int64
	workerID     int64
	workerBits   uint8
	sequenceBits uint8
}

type Snowflake int64;

func SnowflakeGenerator(args SnowflakeOptions) (*SnowflakeNode, error) {

	node := SnowflakeNode{} // create a new snowflake

	// initialize bits and bitmasks
	node.worker = args.workerID
	node.workerMax = -1 ^ (-1 << args.workerBits)
	node.workerMask = node.workerMax << int64(args.sequenceBits)
	node.workerShift = args.sequenceBits

	node.sequenceMask = -1 ^ (-1 << args.sequenceBits)
	node.timeShift = args.workerBits + args.sequenceBits

	if node.worker < 0 || node.worker > node.workerMax {
		return nil, errors.New("Worker ID must be above 0 and below WorkerMax")
	}

	var currentTime = time.Now()

	node.epoch = currentTime.Add(time.Unix(args.epoch/1000, (args.epoch%1000)*1000000).Sub(currentTime))

	// return reference to node
	return &node, nil
}

func (node *SnowflakeNode) GenerateID() Snowflake {

	node.lock.Lock()
	defer node.lock.Unlock()

	now := time.Since(node.epoch).Milliseconds()
	if now == node.time {
		node.sequence = (node.sequence + 1) & node.sequenceMask
		if node.sequence == 0 {
			for now <= node.time {
				now = time.Since(node.epoch).Milliseconds()
			}
		}
	} else {
		node.sequence = 0
	}

	node.time = now

	return Snowflake((now) << int64(node.timeShift) |
		(node.worker << int64(node.workerShift)) |
		(node.sequence),
	)
}

func (flake Snowflake) toString() string {
	return strconv.FormatInt(int64(flake), 10)
}

func stringToSnowflake(id string) (Snowflake, error) {
	i, err := strconv.ParseInt(id, 10, 64)
	return Snowflake(i), err
}

func (flake Snowflake) toBinaryString() string {
	return strconv.FormatInt(int64(flake), 2)
}

func parseBinaryString(id string) (Snowflake, error) {
	i, err := strconv.ParseInt(id, 2, 64)
	return Snowflake(i), err
}

func (flake Snowflake) toBytes() []byte {
	return []byte(flake.toString())
}

func parseBytes(id []byte) (Snowflake, error) {
	i, err := strconv.ParseInt(string(id), 10, 64)
	return Snowflake(i), err
}

func (flake Snowflake) toBase64() string {
	return base64.StdEncoding.EncodeToString((flake.toBytes()))
}

func parseBase64(id string) (Snowflake, error) {
	b, err := base64.StdEncoding.DecodeString(id)
	if err != nil {
		return -1, err
	}
	return parseBytes(b)
}



func SnowflakeWrapper(this js.Value, args []js.Value) interface{} {

	node, err := SnowflakeGenerator(SnowflakeOptions{
		workerID: int64(args[0].Int()),
		workerBits: uint8(args[1].Int()),
		sequenceBits: uint8(args[2].Int()),
		epoch: int64(args[3].Int()),
	})

	if err != nil {

	}

	return js.ValueOf(map[string]interface{}{
		"GenerateID": js.FuncOf(func(this js.Value, _ []js.Value) interface{} {
			flake := node.GenerateID()
			return js.ValueOf(map[string]interface{}{
				"toString": js.FuncOf(func(this js.Value, args []js.Value) any {
					return flake.toString()	
				}),
				"toBytes": js.FuncOf(func(this js.Value, args []js.Value) any {
					return flake.toBytes()	
				}),
				"toBase64": js.FuncOf(func(this js.Value, args []js.Value) any {
					return flake.toBase64()	
				}),
				"toBinaryString": js.FuncOf(func(this js.Value, args []js.Value) any {
					return flake.toBinaryString()	
				}),
			})
		}),
		//! IMPLEMENT THE OTHER METHODS
	})
}


func main() {
	fmt.Println("[SNOWFLAKE.WASM] Snowflake WASM file loaded")
	c := make(chan struct{})

	js.Global().Set("SnowflakeGenerator", js.FuncOf(SnowflakeWrapper))

	<- c
}