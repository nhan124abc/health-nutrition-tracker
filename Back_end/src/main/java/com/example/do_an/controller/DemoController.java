package com.example.do_an.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/demo")
public class DemoController {

    // ================= 200 OK =================
    @GetMapping("/hello")
    public String hello() {
        return "Chào mừng bạn! Đường dẫn này hợp lệ (200 OK).";
    }

    // ================= 400 BAD REQUEST (Thiếu Parameter) =================
    // Phải gọi: /api/demo/400-missing-param?id=123
    // Cố tình gọi: /api/demo/400-missing-param (không có ?id=...) sẽ lỗi 400
    @GetMapping("/400-missing-param")
    public String missingParam(@RequestParam("id") String id) {
        return "Bạn đã truyền id: " + id;
    }

    // ================= 400 BAD REQUEST (Sai kiểu dữ liệu) =================
    // Phải gọi: /api/demo/400-type-mismatch?age=20
    // Cố tình gọi: /api/demo/400-type-mismatch?age=chu-viet (age là chữ thay vì số)
    // sẽ lỗi 400
    @GetMapping("/400-type-mismatch")
    public String typeMismatch(@RequestParam("age") Integer age) {
        return "Tuổi của bạn là: " + age;
    }

    // ================= 400 BAD REQUEST (Lỗi logic nghiệp vụ) =================
    // API này tự động ném ra lỗi logic để thử catch
    @GetMapping("/400-logic-error")
    public String logicError() {
        throw new IllegalArgumentException("Dữ liệu đầu vào không hợp lệ (Ví dụ: Email đã tồn tại)!");
    }

    // ================= 405 METHOD NOT ALLOWED =================
    // API này chỉ hỗ trợ POST.
    // Nếu bạn paste lên trình duyệt (mặc định là GET), nó sẽ ném lỗi 405
    @PostMapping("/405-method-not-allowed")
    public String methodNotAllowed() {
        return "Bạn đã gọi đúng phương thức POST!";
    }

    // ================= 500 INTERNAL SERVER ERROR =================
    // API này cố tình ném ra một Exception không mong muốn (VD rớt mạng DB)
    @GetMapping("/500-server-error")
    public String serverError() {
        throw new RuntimeException("Cơ sở dữ liệu đột ngột bị mất kết nối!");
    }
}
