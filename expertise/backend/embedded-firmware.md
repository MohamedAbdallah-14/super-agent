# Embedded Firmware -- Expertise Module

> An embedded firmware developer builds safety-critical, resource-constrained software for microcontrollers and IoT devices -- from bare-metal register manipulation and RTOS task orchestration to OTA update systems and power-optimized communication stacks. The scope spans real-time scheduling, interrupt-safe programming, peripheral protocols, and field-deployed firmware that must run unattended for years without failure.

---

## 1. Authority & Context

Embedded firmware runs on over 10 billion IoT devices deployed worldwide. The consequences of firmware failure are proven and severe:

- **Mirai botnet (2016)** -- compromised 600,000+ IoT devices via default credentials and absent update mechanisms, launching 1.2 Tbps DDoS attacks that took down major internet infrastructure.
- **Stuxnet (2010)** -- the first known firmware-targeted cyberweapon, reprogramming Siemens PLCs to destroy Iranian nuclear centrifuges while reporting normal operation to operators.
- **Jeep Cherokee remote hack (2015)** -- Miller and Valasek demonstrated full remote vehicle control through the infotainment system's cellular connection, exploiting firmware-level CAN bus access. Resulted in a 1.4 million vehicle recall.

| Standard | Domain | Key requirement |
|----------|--------|----------------|
| IEC 61508 | Industrial safety | Safety Integrity Levels (SIL 1-4), systematic fault avoidance |
| ISO 26262 | Automotive | ASIL A-D classification, MISRA C compliance |
| DO-178C | Avionics | Design Assurance Levels (DAL A-E), MC/DC coverage |
| MISRA C:2012 | All safety-critical | 175 rules restricting dangerous C constructs |
| CERT C | Security-critical | Secure coding rules eliminating undefined behavior |
| Barr Group Embedded C | General embedded | Naming, bracing, and defensive coding conventions |

**Rule:** If the device can injure someone, brick itself remotely, or join a botnet, you need a coding standard. Enforce it with static analysis -- not code review alone.

---

## 2. Platform Coverage

| Platform | Framework | CPU | RAM | Use Case |
|----------|-----------|-----|-----|----------|
| ESP32 | ESP-IDF 5.x | Xtensa/RISC-V 240MHz | 520KB | Wi-Fi/BLE IoT |
| STM32 | HAL/LL | Cortex-M0/M4/M7 | 16KB-1MB | Industrial, automotive |
| Nordic nRF52/53 | Zephyr/nRF Connect SDK | Cortex-M4/M33 | 256KB | BLE, ultra-low power |
| RP2040 | Pico SDK | Cortex-M0+ dual-core 133MHz | 264KB | Education, simple embedded |
| TI CC2652 | TI-RTOS/Zephyr | Cortex-M4F 48MHz | 80KB | Zigbee, Thread, multi-protocol |
| NXP i.MX RT | MCUXpresso SDK | Cortex-M7 600MHz | 1MB+ | High-perf embedded, HMI |

**Selection:** Battery BLE --> nRF52840. Wi-Fi home --> ESP32-S3. Automotive/CAN --> STM32. Prototyping --> RP2040.

---

## 3. Build System & Toolchain

```cmake
cmake_minimum_required(VERSION 3.20)
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_SOURCE_DIR}/cmake/arm-none-eabi.cmake)
project(sensor-node C ASM)
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

add_executable(${PROJECT_NAME}
    src/main.c src/sensor_task.c src/comms_task.c
    startup/startup_stm32f407.s
)
target_compile_options(${PROJECT_NAME} PRIVATE
    -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard
    -Wall -Wextra -Werror -Os
    -ffunction-sections -fdata-sections
)
target_link_options(${PROJECT_NAME} PRIVATE
    -T${CMAKE_SOURCE_DIR}/linker/STM32F407.ld
    -Wl,--gc-sections -Wl,-Map=output.map
    --specs=nano.specs
)
```

Non-negotiable compiler warnings:

```bash
-Wall -Wextra -Werror -Wshadow -Wdouble-promotion -Wformat=2
-Wformat-truncation -Wundef -fno-common -Wconversion
```

---

## 4. RTOS Patterns (FreeRTOS)

### Task creation with static allocation

```c
static StaticTask_t sensor_tcb;
static StackType_t sensor_stack[SENSOR_STACK_SIZE];

TaskHandle_t sensor_handle = xTaskCreateStatic(
    sensor_task_fn, "Sensor", SENSOR_STACK_SIZE, NULL,
    PRIORITY_SENSOR,  // tskIDLE_PRIORITY + 2
    sensor_stack, &sensor_tcb
);
configASSERT(sensor_handle != NULL);
```

### Priority assignment

```c
#define PRIORITY_IDLE       (tskIDLE_PRIORITY)       // 0
#define PRIORITY_LOGGING    (tskIDLE_PRIORITY + 1)   // 1
#define PRIORITY_SENSOR     (tskIDLE_PRIORITY + 2)   // 2
#define PRIORITY_COMMS      (tskIDLE_PRIORITY + 3)   // 3
#define PRIORITY_SAFETY     (tskIDLE_PRIORITY + 4)   // 4
```

**Rule:** Assign by deadline urgency, not perceived importance.

### Queue-based inter-task communication

```c
static StaticQueue_t queue_tcb;
static uint8_t queue_storage[QUEUE_LEN * sizeof(sensor_reading_t)];

QueueHandle_t sensor_queue = xQueueCreateStatic(
    QUEUE_LEN, sizeof(sensor_reading_t), queue_storage, &queue_tcb
);

// Producer:
if (xQueueSend(sensor_queue, &reading, pdMS_TO_TICKS(100)) != pdPASS) {
    stats.dropped_readings++;
}
// Consumer:
if (xQueueReceive(sensor_queue, &reading, pdMS_TO_TICKS(1000)) == pdPASS) {
    transmit_reading(&reading);
}
```

### Priority inversion prevention

```c
// Priority inheritance mutex -- NOT binary semaphore
SemaphoreHandle_t spi_mutex = xSemaphoreCreateMutex();

if (xSemaphoreTake(spi_mutex, pdMS_TO_TICKS(50)) == pdPASS) {
    spi_transfer(data, len);
    xSemaphoreGive(spi_mutex);
}
```

### Watchdog feeding from task heartbeats

```c
static volatile uint32_t task_heartbeats[TASK_COUNT];

void watchdog_task_fn(void *param) {
    static uint32_t last[TASK_COUNT];
    for (;;) {
        bool all_alive = true;
        for (int i = 0; i < TASK_COUNT; i++) {
            if (task_heartbeats[i] == last[i]) { all_alive = false; }
            last[i] = task_heartbeats[i];
        }
        if (all_alive) { HAL_IWDG_Refresh(&hiwdg); }
        vTaskDelay(pdMS_TO_TICKS(WATCHDOG_CHECK_MS));
    }
}
```

---

## 5. Memory Discipline

Memory errors are the number one cause of firmware field failures. Heap fragmentation crashes devices after days of operation -- long after testing ends.

### NO malloc/free after initialization

```c
// CORRECT: static allocation
static uint8_t uart_rx_buffer[UART_RX_BUF_SIZE];
static sensor_reading_t reading_pool[MAX_READINGS];

// WRONG: runtime allocation -- fragmentation time bomb
void handle_message(void) {
    char *buf = malloc(msg_len);  // NEVER after init
    free(buf);
}
```

Set `configSUPPORT_DYNAMIC_ALLOCATION` to 0 in `FreeRTOSConfig.h` to enforce at compile time.

### Stack sizing

Measure with `uxTaskGetStackHighWaterMark()`, then set final size to (measured usage + 20% margin). Start with 2x expected during development.

### Fixed-size memory pool

```c
#define POOL_SIZE  32
#define BLOCK_SIZE 128
static uint8_t pool_storage[POOL_SIZE][BLOCK_SIZE];
static uint8_t pool_bitmap[POOL_SIZE];

void *pool_alloc(void) {
    for (int i = 0; i < POOL_SIZE; i++) {
        if (!pool_bitmap[i]) {
            pool_bitmap[i] = 1;
            return pool_storage[i];
        }
    }
    return NULL;  // Pool exhausted
}

void pool_free(void *block) {
    if (!block) return;
    ptrdiff_t idx = ((uint8_t *)block - (uint8_t *)pool_storage) / BLOCK_SIZE;
    if (idx >= 0 && idx < POOL_SIZE) pool_bitmap[idx] = 0;
}
```

---

## 6. ISR (Interrupt Service Routine) Discipline

### Cardinal rules

1. ISRs MUST be minimal: set flag/semaphore, return immediately.
2. Never call blocking functions, `printf`, `malloc`, or mutex-acquiring functions from ISR.
3. Use `FromISR` variants of all FreeRTOS API calls.
4. Disable interrupts (not mutexes) for critical sections shared between ISR and task code.
5. Always clear the interrupt flag before returning.

### Correct: deferred processing

```c
void EXTI0_IRQHandler(void) {
    if (__HAL_GPIO_EXTI_GET_IT(GPIO_PIN_0)) {
        __HAL_GPIO_EXTI_CLEAR_IT(GPIO_PIN_0);
        BaseType_t woken = pdFALSE;
        xSemaphoreGiveFromISR(button_sem, &woken);
        portYIELD_FROM_ISR(woken);
    }
}

void button_task_fn(void *param) {
    for (;;) {
        if (xSemaphoreTake(button_sem, portMAX_DELAY) == pdPASS) {
            debounce_and_process_button();
        }
    }
}
```

### Wrong: work in ISR

```c
void EXTI0_IRQHandler(void) {
    printf("Button pressed!\n");          // NEVER: blocking I/O
    process_button_event();               // NEVER: complex logic
    vTaskDelay(pdMS_TO_TICKS(100));       // NEVER: blocking call
    xSemaphoreTake(mutex, portMAX_DELAY); // NEVER: mutex in ISR
}
```

### Volatile for ISR-shared data

```c
static volatile uint32_t isr_timestamp;
static volatile bool     isr_event_pending;

// In task: read with interrupts disabled for multi-word atomicity
uint32_t read_isr_timestamp(void) {
    taskENTER_CRITICAL();
    uint32_t ts = isr_timestamp;
    isr_event_pending = false;
    taskEXIT_CRITICAL();
    return ts;
}
```

---

## 7. Communication Protocols

### UART with DMA and ring buffer

```c
typedef struct {
    uint8_t buffer[UART_BUF_SIZE];
    volatile uint16_t head;
    volatile uint16_t tail;
} ring_buffer_t;

void uart_init(UART_HandleTypeDef *huart) {
    huart->Init.BaudRate = 115200;
    huart->Init.WordLength = UART_WORDLENGTH_8B;
    huart->Init.StopBits = UART_STOPBITS_1;
    huart->Init.Parity = UART_PARITY_NONE;
    HAL_UART_Init(huart);
    HAL_UARTEx_ReceiveToIdle_DMA(huart, ring.buffer, UART_BUF_SIZE);
}
```

### SPI master with chip select

```c
HAL_StatusTypeDef spi_transfer(spi_device_t *dev, const uint8_t *tx,
                                uint8_t *rx, uint16_t len) {
    HAL_GPIO_WritePin(dev->cs_port, dev->cs_pin, GPIO_PIN_RESET);
    HAL_StatusTypeDef status = HAL_SPI_TransmitReceive(
        dev->hspi, (uint8_t *)tx, rx, len, SPI_TIMEOUT_MS);
    HAL_GPIO_WritePin(dev->cs_port, dev->cs_pin, GPIO_PIN_SET);
    return status;
}
```

### I2C with error recovery

```c
HAL_StatusTypeDef i2c_read_reg(I2C_HandleTypeDef *hi2c, uint8_t addr,
                                uint8_t reg, uint8_t *data, uint16_t len) {
    HAL_StatusTypeDef status = HAL_I2C_Mem_Read(
        hi2c, addr << 1, reg, I2C_MEMADD_SIZE_8BIT, data, len, I2C_TIMEOUT_MS);
    if (status != HAL_OK) {
        i2c_bus_recovery(hi2c);  // Toggle SCL 9x to release stuck SDA
        status = HAL_I2C_Mem_Read(
            hi2c, addr << 1, reg, I2C_MEMADD_SIZE_8BIT, data, len, I2C_TIMEOUT_MS);
    }
    return status;
}
```

### CAN bus with filtering

```c
void can_init(CAN_HandleTypeDef *hcan) {
    hcan->Init.Prescaler = 6;  // 500 kbit/s on 42MHz APB1
    hcan->Init.Mode = CAN_MODE_NORMAL;
    HAL_CAN_Init(hcan);

    CAN_FilterTypeDef filter = {
        .FilterIdHigh = 0x100 << 5,
        .FilterMaskIdHigh = 0x700 << 5,
        .FilterFIFOAssignment = CAN_FILTER_FIFO0,
        .FilterActivation = ENABLE,
        .FilterMode = CAN_FILTERMODE_IDMASK,
    };
    HAL_CAN_ConfigFilter(hcan, &filter);
    HAL_CAN_Start(hcan);
    HAL_CAN_ActivateNotification(hcan, CAN_IT_RX_FIFO0_MSG_PENDING);
}
```

### BLE (Zephyr)

```c
BT_GATT_SERVICE_DEFINE(sensor_svc,
    BT_GATT_PRIMARY_SERVICE(BT_UUID_DECLARE_128(SENSOR_SERVICE_UUID)),
    BT_GATT_CHARACTERISTIC(
        BT_UUID_DECLARE_128(SENSOR_TEMP_UUID),
        BT_GATT_CHRC_READ | BT_GATT_CHRC_NOTIFY,
        BT_GATT_PERM_READ, read_temperature, NULL, &current_temp),
    BT_GATT_CCC(temp_ccc_changed, BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),
);
```

---

## 8. OTA Update Patterns

A failed OTA must never brick the device. Use A/B partitioning with cryptographic verification.

### Flash layout (dual-bank)

```
+------------------+  0x08000000
| Bootloader (32K) |  Verifies signature, selects active partition
+------------------+  0x08008000
| Partition A (480K)|  Active firmware
+------------------+  0x08080000
| Partition B (480K)|  OTA staging area
+------------------+  0x080F8000
| Config (32K)     |  Boot flags, version, rollback counter
+------------------+
```

### OTA header with integrity verification

```c
typedef struct __attribute__((packed)) {
    uint32_t magic;          // 0xDEADBEEF
    uint32_t header_version;
    uint32_t fw_version;     // Monotonic -- prevents downgrade
    uint32_t image_size;
    uint32_t hw_id;          // Hardware compatibility
    uint8_t  sha256[32];     // SHA-256 of payload
    uint8_t  signature[64];  // Ed25519 over header + payload
    uint8_t  payload[];
} ota_header_t;
```

### Verification sequence

1. Check magic number (reject garbage fast).
2. Verify hardware compatibility (`hw_id`).
3. Reject downgrade (monotonic `fw_version`).
4. Compute and compare SHA-256 hash.
5. Verify Ed25519/ECDSA signature against embedded public key.

### Automatic rollback

```c
void bootloader_select_partition(void) {
    boot_config_t cfg;
    read_boot_config(&cfg);
    if (cfg.state == BOOT_PENDING_VERIFY) {
        cfg.boot_count++;
        if (cfg.boot_count > MAX_BOOT_ATTEMPTS) {
            cfg.active_partition ^= 1;  // Swap back
            cfg.state = BOOT_ROLLBACK;
            cfg.boot_count = 0;
        }
        write_boot_config(&cfg);
    }
    jump_to_partition(cfg.active_partition);
}

// Application calls after successful boot + self-test
void ota_confirm_image(void) {
    boot_config_t cfg;
    read_boot_config(&cfg);
    cfg.state = BOOT_OK;
    cfg.boot_count = 0;
    write_boot_config(&cfg);
}
```

---

## 9. Power Optimization

Battery life is a feature. A sensor node lasting 6 months instead of 2 years is a product failure.

### Current consumption budget

| State | ESP32 | nRF52840 | STM32L476 |
|-------|-------|----------|-----------|
| Active (CPU + radio) | 80-240 mA | 5-15 mA | 10-30 mA |
| Light sleep (RAM retained) | 0.8 mA | 1.5 uA | 2 uA |
| Deep sleep (RTC only) | 10 uA | 0.4 uA | 0.03 uA |
| Shutdown (wake via pin) | 5 uA | 0.3 uA | 0.01 uA |

### Duty cycling

```c
void low_power_task(void *param) {
    for (;;) {
        enable_sensor_power();
        vTaskDelay(pdMS_TO_TICKS(10));  // Sensor startup
        sensor_reading_t reading = sample_sensor();
        disable_sensor_power();

        if (reading_changed(&reading) || interval_elapsed()) {
            enable_radio();
            transmit_reading(&reading);
            disable_radio();
        }
        enter_deep_sleep(SLEEP_DURATION_SEC);
    }
}
```

### Peripheral power gating

```c
void power_optimize_peripherals(void) {
    __HAL_RCC_GPIOB_CLK_DISABLE();
    __HAL_RCC_SPI2_CLK_DISABLE();
    __HAL_RCC_USART2_CLK_DISABLE();
    // Configure unused pins as analog (lowest leakage)
    GPIO_InitTypeDef gpio = {.Pin = GPIO_PIN_All, .Mode = GPIO_MODE_ANALOG};
    HAL_GPIO_Init(GPIOB, &gpio);
}
```

---

## 10. Testing Strategy

### Unit testing on host

Run business logic tests on the development machine. No hardware needed.

```c
#include "unity.h"
#include "sensor_calibration.h"

void test_calibration_linear(void) {
    calibration_t cal = {.offset = 100, .scale = 256};
    TEST_ASSERT_EQUAL_INT32(2148, apply_calibration(&cal, 2048));
}

void test_calibration_clamps(void) {
    calibration_t cal = {.offset = 0, .scale = 512};
    TEST_ASSERT_EQUAL_INT32(SENSOR_MAX_VALUE, apply_calibration(&cal, 20000));
}
```

### Hardware-in-the-loop (HIL)

- Test jig with known stimulus (voltage source, signal generator).
- Automate with pytest + serial port.
- Assert on timing (logic analyzer), values (ADC readback), protocol correctness (bus sniffer).

### Static analysis

```bash
cppcheck --addon=misra --suppress=misra-c2012-3.1 src/   # MISRA
scan-build -o reports/ cmake --build build/                # Clang analyzer
pclp64 -w3 +misra(c2012) src/*.c                          # PC-lint Plus
```

---

## 11. Anti-Patterns & Pitfalls

### 1. Blocking in ISR
Delays, `printf`, or mutex locks block all lower-priority interrupts and RTOS scheduling. Causes HardFault or watchdog reset. **Fix:** Set flag/semaphore in ISR; process in task context.

### 2. Unbounded queues
Producer outpacing consumer exhausts heap after hours. **Fix:** Fixed-size static queues with explicit overflow handling.

### 3. Missing watchdog
Any hang (deadlock, infinite loop, corruption) bricks the device until power cycled. Remote deployment = truck roll. **Fix:** Hardware watchdog fed only when all tasks report healthy.

### 4. Dynamic memory after init
Without MMU, fragmentation is permanent. Allocations fail after days despite sufficient total free memory. **Fix:** Pre-allocate everything. `configSUPPORT_DYNAMIC_ALLOCATION = 0`.

### 5. Busy-wait polling
`while (!ready) {}` wastes 100% CPU, drains battery, starves lower-priority tasks. **Fix:** Interrupt-driven I/O with semaphores or event groups.

### 6. Printf debugging in production
UART printf takes milliseconds -- disrupts real-time behavior, masks or creates timing bugs. **Fix:** Buffered non-blocking logger with compile-time level filtering. Strip in release.

### 7. Hardcoded delays instead of events
`HAL_Delay(100)` assumes fixed timing. Temperature and voltage shift actual peripheral timing. **Fix:** Poll ready flag or use interrupt. If delay needed, use datasheet max + margin.

### 8. Unchecked error return values
`HAL_SPI_Transmit()` returns `HAL_OK/ERROR/BUSY/TIMEOUT`. Ignoring it means corrupted data flows silently. **Fix:** Check every HAL return. Log and handle each case.

### 9. Missing volatile on ISR-shared globals
Compiler caches variable in register; task never sees ISR update. Invisible in debug builds. **Fix:** `volatile` on all ISR-shared variables. Critical sections for multi-word access.

### 10. Recursive functions
Embedded stacks are 512B-8KB. Recursion overflows silently, corrupting adjacent memory. **Fix:** Iterative algorithms with bounded explicit stacks.

### 11. Clock configuration failure ignored
External crystal failure falls back to internal RC. UART baud drifts, protocols fail silently. **Fix:** Check `HAL_RCC_OscConfig()` return. Implement fallback or assert-and-reset.

### 12. Testing only under debugger
JTAG halts CPU on breakpoints, stopping interrupts and watchdogs. Timing bugs never reproduce. **Fix:** Test in release mode, disconnected. Use logic analyzers for observation.

---

## 12. Decision Trees

### Which RTOS?

```
Need an RTOS?
  +-- Certification required (IEC 61508, DO-178C)?
  |     --> SafeRTOS or ThreadX (pre-certified)
  +-- Nordic nRF or broad HW support?
  |     --> Zephyr (600+ boards, built-in BLE/networking)
  +-- Simple, minimal, well-understood?
  |     --> FreeRTOS (largest community, AWS backing)
  +-- Single control loop sufficient?
        --> No RTOS -- super loop with timer interrupts
```

### Which protocol?

```
Communicating with another device?
  +-- Same PCB?
  |     +-- High speed (>1 Mbps) --> SPI
  |     +-- Many devices, low pins --> I2C
  |     +-- Debug/logging --> UART
  +-- Vehicle/machine ECUs? --> CAN bus
  +-- Wireless short range?
  |     +-- Low power --> BLE
  |     +-- Mesh --> Zigbee/Thread
  |     +-- Throughput --> Wi-Fi
  +-- Long range (>1km)? --> LoRa or LTE-M/NB-IoT
```

---

## 13. Project Structure

```
firmware-project/
  CMakeLists.txt
  cmake/
    arm-none-eabi.cmake       # Toolchain file
  src/
    main.c                    # System init, RTOS start
    app/                      # Business logic (portable)
      sensor_task.c
      comms_task.c
    drivers/                  # Hardware-specific drivers
      spi_flash.c
      sensor_bme280.c
    hal/                      # Abstraction layer (portability)
      hal_gpio.h
      hal_spi.h
  include/
    config/
      FreeRTOSConfig.h
      board_config.h          # All pin assignments in one place
  linker/
    STM32F407.ld
  startup/
    startup_stm32f407.s
  test/
    test_sensor_calibration.c # Host-side unit tests
  tools/
    flash.sh                  # OpenOCD/J-Link flashing
```

**Key rules:**
- Separate `app/` (portable logic) from `drivers/` (hardware-specific).
- `hal/` layer allows swapping MCU families without rewriting app code.
- Tests compile and run on host -- no target hardware needed for unit tests.
- One `board_config.h` owns all pin assignments -- never scatter definitions.

---

*Researched: 2026-03-12 | Sources: [FreeRTOS Reference Manual](https://www.freertos.org/Documentation/RTOS_book.html), [MISRA C:2012 Guidelines](https://misra.org.uk/misra-c/), [CERT C Coding Standard](https://wiki.sei.cmu.edu/confluence/display/c), [Barr Group Embedded C Coding Standard](https://barrgroup.com/embedded-systems/books/embedded-c-coding-standard), [ESP-IDF Programming Guide](https://docs.espressif.com/projects/esp-idf/en/stable/), [Zephyr Project Documentation](https://docs.zephyrproject.org/latest/), [STM32 HAL Reference](https://www.st.com/resource/en/user_manual/um1725-description-of-stm32f4-hal-and-low-layer-drivers-stmicroelectronics.pdf), [ARM Cortex-M Programming Guide](https://developer.arm.com/documentation/dui0553/latest/), [IEC 61508 Functional Safety](https://www.iec.ch/functionalsafety), [ISO 26262 Road Vehicles Safety](https://www.iso.org/standard/68383.html), [Mirai Botnet Analysis (Cloudflare)](https://blog.cloudflare.com/inside-mirai-the-infamous-iot-botnet/), [Miller & Valasek Jeep Hack (2015)](https://illmatics.com/Remote%20Car%20Hacking.pdf), [Stuxnet Analysis (Symantec)](https://docs.broadcom.com/doc/security-response-w32-stuxnet-dossier-11-en)*
